const { Server } = require("socket.io");

const io = new Server(3000, {
    cors: {
        origin: "*", // Allow all origins for simplicity in dev
    },
});

let onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // User comes online
    socket.on("user_online", (userId) => {
        onlineUsers.set(userId, socket.id);
        io.emit("status_update", { userId, isOnline: true });
        console.log(`User ${userId} is online`);
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
        socket.emit("message_sent", { messageId: message._id, status: "sent" });
    });

    // Typing indicator
    socket.on("typing", ({ chatId, userId, isTyping }) => {
        socket.to(chatId).emit("user_typing", { userId, isTyping });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        // Find userId
        for (let [uid, sid] of onlineUsers.entries()) {
            if (sid === socket.id) {
                onlineUsers.delete(uid);
                io.emit("status_update", { userId: uid, isOnline: false, lastSeen: Date.now() });
                break;
            }
        }
    });
});

console.log("Socket.io server running on port 3000");
