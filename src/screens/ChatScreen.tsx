import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useDispatch, useSelector } from 'react-redux';
import { collection, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, increment, updateDoc } from 'firebase/firestore';
import { firestore, storage } from '../config/firebase';
import socketService from '../services/socketService';
import InputToolbar from '../components/InputToolbar';
import ChatBubble from '../components/ChatBubble';
import ChatSkeleton from '../components/ChatSkeleton';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { RootState } from '../store';
import { addMessage, setMessages, updateMessageStatus } from '../store/slices/chatSlice';
import { FlatList } from 'react-native';

const ChatScreen = ({ route, navigation }: any) => {
    const { userId, userName } = route.params;
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const messages = useSelector((state: RootState) => state.chat.messages);
    const users = useSelector((state: RootState) => state.users.users);
    const flatListRef = useRef<any>(null);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [inputHeight, setInputHeight] = useState(72);
    const stickyOffset = useMemo(() => ({ closed: 16, opened: insets.bottom + 16 }), [insets.bottom]);

    if (!currentUser) {
        return null;
    }

    // Chat ID generation (canonical)
    const chatId = currentUser!.uid < userId
        ? `${currentUser!.uid}_${userId}`
        : `${userId}_${currentUser!.uid}`;

    useEffect(() => {
        setLoadingMessages(true);
    }, [chatId]);

    useEffect(() => {
        // Ensure socket is connected and join chat room for status/typing/message routing
        socketService.connect();
        socketService.emit('join_chat', chatId);

        const handleReceiveMessage = (msg: any) => {
            if (msg.user._id !== currentUser!.uid) {
                socketService.emit('message_delivered', { messageId: msg._id, chatId });
                socketService.emit('message_seen', { messageId: msg._id, chatId });
                dispatch(addMessage({ ...msg, sent: true, received: true, seen: true }));

                // Persist delivery/read for consistency
                updateDoc(doc(firestore, 'chats', chatId, 'messages', msg._id), {
                    received: true,
                    seen: true
                }).catch(() => {});
            }
        };

        const handleMessageStatusUpdate = ({ messageId, status, chatId: statusChatId }: any) => {
            if (statusChatId && statusChatId !== chatId) return;
            dispatch(updateMessageStatus({
                _id: messageId,
                received: status === 'delivered' || status === 'seen',
                sent: status === 'sent',
                seen: status === 'seen'
            }));

            // Mirror status into Firestore so both sides stay in sync
            updateDoc(doc(firestore, 'chats', chatId, 'messages', messageId), {
                sent: status === 'sent' || status === 'delivered' || status === 'seen',
                received: status === 'delivered' || status === 'seen',
                seen: status === 'seen'
            }).catch(() => {});
        };

        const handleMessageSent = ({ messageId, chatId: statusChatId }: any) => {
            if (statusChatId && statusChatId !== chatId) return;
            dispatch(updateMessageStatus({ _id: messageId, sent: true }));
            updateDoc(doc(firestore, 'chats', chatId, 'messages', messageId), {
                sent: true
            }).catch(() => {});
        };

        const handleUserTyping = ({ userId: uid, isTyping, chatId: typingChatId }: any) => {
            if (typingChatId && typingChatId !== chatId) return;
            if (uid === userId) {
                navigation.setOptions({ headerTitle: isTyping ? 'Typing...' : userName });
            }
        };

        // Listen for new messages via Socket (Immediate feedback)
        socketService.on('receive_message', handleReceiveMessage);
        socketService.on('message_status_update', handleMessageStatusUpdate);
        socketService.on('message_sent', handleMessageSent);
        socketService.on('user_typing', handleUserTyping);

        // Firestore Sync (Source of Truth)
        const messagesRef = collection(firestore, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => {
                const data: any = doc.data();
                return {
                _id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toMillis() || Date.now(),
                    sent: data.sent ?? false,
                    received: data.received ?? false,
                    seen: data.seen ?? false,
                };
            }) as any[];
            dispatch(setMessages(msgs));
            setLoadingMessages(false);

            // Mark unread messages as seen
            msgs.forEach(msg => {
                if (msg.user._id !== currentUser!.uid && !msg.seen) {
                    socketService.emit('message_seen', { messageId: msg._id, chatId });
                    updateDoc(doc(firestore, 'chats', chatId, 'messages', msg._id), {
                        seen: true,
                        received: true
                    }).catch(() => {});
                }
            });
        });

        return () => {
            socketService.off('receive_message');
            socketService.off('message_status_update');
            socketService.off('message_sent');
            socketService.off('user_typing');
            unsubscribe();
        };
    }, [chatId, currentUser?.uid, dispatch, userId, userName]);

    // Reset unread count when entering chat
    useEffect(() => {
        const resetUnread = async () => {
            const chatRef = doc(firestore, 'chats', chatId);
            await setDoc(chatRef, {
                [`unreadCount_${currentUser!.uid}`]: 0
            }, { merge: true });
        };
        resetUnread();
    }, [chatId, currentUser]);

    const handleSend = async (text: string, image?: string) => {
        if (!text.trim() && !image) return;
        let imageUrl = '';

        if (image) {
            console.log("Uploading image:", image);
            try {
                const response = await fetch(image);
                const blob = await response.blob();

                const filename = image.substring(image.lastIndexOf('/') + 1) || `image-${Date.now()}.jpg`;
                const storageRef = ref(storage, `images/${currentUser!.uid}/${Date.now()}-${filename}`);

                await uploadBytes(storageRef, blob, {
                    contentType: blob.type || 'image/jpeg',
                });

                imageUrl = await getDownloadURL(storageRef);
            } catch (e: any) {
                console.error("Upload failed", {
                    message: e?.message,
                    code: e?.code,
                    serverResponse: e?.serverResponse,
                });
                return;
            }
        }

        const messageId = doc(collection(firestore, 'chats', chatId, 'messages')).id;

        const messageData = {
            _id: messageId,
            text: text || '',
            createdAt: Date.now(), // Use timestamp for socket, serverTimestamp for DB
            user: {
                _id: currentUser!.uid,
                name: currentUser!.displayName || 'User',
                avatar: currentUser!.photoURL,
            },
            image: imageUrl,
            sent: false,
            received: false,
            seen: false,
            chatId // for socket routing
        };

        // Optimistic add for immediate UI feedback
        dispatch(addMessage(messageData as any));

        // 1. Emit Socket
        socketService.emit('send_message', { ...messageData, recipientId: userId });

        // 3. Save to Firestore (Messages)
        const { _id, chatId: cid, ...firestoreData } = messageData as any;
        await setDoc(doc(firestore, 'chats', chatId, 'messages', messageId), {
            ...firestoreData,
            createdAt: serverTimestamp(),
            sent: false,
            received: false,
            seen: false
        });

        // 4. Update Chat Summary (Last Message & Unread)
        const chatRef = doc(firestore, 'chats', chatId);
        await setDoc(chatRef, {
            lastMessage: image ? '📷 Image' : text,
            lastMessageTime: serverTimestamp(),
            participants: [currentUser!.uid, userId],
            [`unreadCount_${userId}`]: increment(1)
        }, { merge: true });
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], // Updated to string array
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
        });

        if (!result.canceled) {
            handleSend('', result.assets[0].uri);
        }
    };

    const handleTyping = (text: string) => {
        socketService.emit('typing', { chatId, userId: currentUser!.uid, isTyping: text.length > 0 });
    };

    const otherUser = useMemo(() => users.find(u => u.uid === userId), [users, userId]);
    const subtitle = useMemo(() => {
        if (otherUser?.isOnline) return 'Online';
        const lastSeenRaw: any = otherUser?.lastSeen;
        const lastSeenMs = typeof lastSeenRaw === 'number'
            ? lastSeenRaw
            : lastSeenRaw?.toMillis?.();
        if (lastSeenMs) {
            const date = new Date(lastSeenMs);
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const today = new Date();
            const isToday = date.toDateString() === today.toDateString();
            return `Last seen ${isToday ? 'today' : date.toLocaleDateString()} ${time}`;
        }
        return '';
    }, [otherUser]);

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 16}]}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{userName}</Text>
                    {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
                </View>
            </View>

            <View style={[styles.flexContainer]}>
                {loadingMessages ? (
                    <ChatSkeleton />
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item._id}
                        renderItem={({ item }) => <ChatBubble message={item} isCurrentUser={item.user._id === currentUser!.uid} />}
                        inverted
                        style={styles.listContainer}
                        contentContainerStyle={[
                            styles.list,
                            { paddingBottom: inputHeight + insets.bottom + 16 }
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>
            <KeyboardStickyView offset={stickyOffset}>
                <View
                    style={[styles.inputWrapper]}
                    onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
                >
                    <InputToolbar onSend={handleSend} onPickImage={handlePickImage} onTyping={handleTyping} />
                </View>
            </KeyboardStickyView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F', // Deeper black
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#1A1A1A',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
        zIndex: 10,
    },
    backButton: {
        marginRight: 12,
    },
    headerInfo: {
        flex: 1,
    },
    headerTitle: {
        color: 'white',
        fontWeight: '700',
        fontSize: 18,
    },
    headerSubtitle: {
        color: '#A0A0A0',
        fontSize: 12,
        marginTop: 2,
    },
    list: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    listContainer: {
        flex: 1,
    },
    inputWrapper: {
        backgroundColor: '#0F0F0F',
        borderTopWidth: 1,
        borderTopColor: '#1F1F1F',
    },
    flexContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
});

export default ChatScreen;
