const { Server } = require("socket.io");

const io = new Server(3000, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
    },
});

const admin = require("firebase-admin");
let serviceAccount;
try {
    serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin initialized");
} catch (error) {
    console.warn("Firebase Admin NOT initialized. Missing or invalid serviceAccountKey.json");
}

let onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User comes online
    socket.on("user_online", (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit("status_update", { userId, isOnline: true });
        if (admin.apps.length > 0) {
            admin.firestore().collection('users').doc(userId).set({
                isOnline: true,
                lastSeen: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(() => {});
        }
        console.log(`User ${userId} is online`);
    });

    socket.on("user_offline", (userId) => {
        onlineUsers.delete(userId);
        io.emit("status_update", { userId, isOnline: false, lastSeen: Date.now() });
        if (admin.apps.length > 0) {
            admin.firestore().collection('users').doc(userId).set({
                isOnline: false,
                lastSeen: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).catch(() => {});
        }
    });

    // Join a specific chat room (optional, depending on architecture)
    // For 1-to-1, we can just send to specific socketId if we track it, or room = chatId
    socket.on("join_chat", (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    // Send message
    socket.on("send_message", (message) => {
        // Message object should contain chatId or recipientId
        const { chatId, recipientId, ...msgData } = message;

        // Broadcast to the room (sender + recipient)
        if (chatId) {
            socket.to(chatId).emit("receive_message", message);
        }

        // Also try direct emit if we have recipient online (redundant if using rooms but good backup)
        if (recipientId && onlineUsers.has(recipientId)) {
            // io.to(onlineUsers.get(recipientId)).emit("receive_message", message); 
            // Note: socket.to(room) excludes sender. io.to includes.
        }

        // Acknowledge sent
        socket.emit("message_sent", { messageId: message._id, status: "sent", chatId });

        // Push Notification via FCM
        if (recipientId && admin.apps.length > 0) {
            admin.firestore().collection('users').doc(recipientId).get()
                .then(doc => {
                    if (!doc.exists) {
                        console.warn("Recipient not found for push", recipientId);
                        return;
                    }
                    const data = doc.data() || {};
                    // Prefer native device token, fall back to stored fcmToken, ignore Expo token here
                    const token = data.devicePushToken || data.fcmToken;
                    if (!token) {
                        console.warn("No device token for recipient", recipientId);
                        return;
                    }

                    const payload = {
                        token,
                        notification: {
                            title: msgData.user?.name || "New Message",
                            body: msgData.text || "Sent an image",
                        },
                        data: {
                            chatId: chatId || "",
                            senderId: msgData.user?._id || "",
                            senderName: msgData.user?.name || "",
                            type: msgData.text ? "text" : "media"
                        }
                    };

                    admin.messaging().send(payload)
                        .then(response => console.log("FCM sent:", response))
                        .catch(error => console.error("FCM error:", error));
                })
                .catch(err => console.error("Firestore error:", err));
        }
    });

    // Typing indicator
    socket.on("typing", ({ chatId, userId, isTyping }) => {
        socket.to(chatId).emit("user_typing", { userId, isTyping });
    });

    // Message Delivered
    socket.on("message_delivered", ({ messageId, chatId }) => {
        socket.to(chatId).emit("message_status_update", { messageId, status: "delivered", chatId });
    });

    // Message Seen
    socket.on("message_seen", ({ messageId, chatId }) => {
        socket.to(chatId).emit("message_status_update", { messageId, status: "seen", chatId });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Find userId
        for (let [uid, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                onlineUsers.delete(uid);
                io.emit("status_update", { userId: uid, isOnline: false, lastSeen: Date.now() });
                if (admin.apps.length > 0) {
                    admin.firestore().collection('users').doc(uid).set({
                        isOnline: false,
                        lastSeen: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true }).catch(() => {});
                }
                break;
            }
        }
    });
});

console.log("Socket.io server running on port 3000");
