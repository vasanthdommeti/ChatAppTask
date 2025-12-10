import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { firestore, storage } from '../config/firebase';
import socketService from '../services/socketService';
import InputToolbar from '../components/InputToolbar';
import ChatBubble from '../components/ChatBubble';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { RootState } from '../store';
import { addMessage, setMessages, updateMessageStatus } from '../store/slices/chatSlice';

const ChatScreen = ({ route, navigation }: any) => {
    const { userId, userName } = route.params;
    const dispatch = useDispatch();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const messages = useSelector((state: RootState) => state.chat.messages);
    const flatListRef = useRef<FlatList>(null);

    if (!currentUser) {
        return null;
    }

    // Chat ID generation (canonical)
    const chatId = currentUser!.uid < userId
        ? `${currentUser!.uid}_${userId}`
        : `${userId}_${currentUser!.uid}`;

    useEffect(() => {
        // Connect socket logic
        socketService.emit('join_chat', chatId);

        // Listen for new messages via Socket (Immediate feedback)
        socketService.on('receive_message', (msg) => {
            if (msg.user._id !== currentUser!.uid) {
                // Acknowledge delivery
                socketService.emit('message_delivered', { messageId: msg._id, chatId });
                dispatch(addMessage({ ...msg, received: true }));
            }
        });

        socketService.on('message_status_update', ({ messageId, status }) => {
            dispatch(updateMessageStatus({ _id: messageId, received: status === 'delivered', sent: status === 'sent' }));
        });

        socketService.on('user_typing', ({ userId: uid, isTyping }) => {
            if (uid === userId) {
                navigation.setOptions({ headerTitle: isTyping ? 'Typing...' : userName });
            }
        });

        // Firestore Sync (Source of Truth)
        const messagesRef = collection(firestore, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                _id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toMillis() || Date.now(),
            })) as any[];
            dispatch(setMessages(msgs));
        });

        return () => {
            socketService.off('receive_message');
            socketService.off('user_typing');
            unsubscribe();
        };
    }, [chatId, currentUser?.uid, dispatch, userId, userName]);

    const handleSend = async (text: string, image?: string) => {
        let imageUrl = '';

        if (image) {
            // Upload image
            try {
                const response = await fetch(image);
                const blob = await response.blob();
                const filename = image.substring(image.lastIndexOf('/') + 1);
                const storageRef = ref(storage, `images/${filename}`);
                await uploadBytes(storageRef, blob);
                imageUrl = await getDownloadURL(storageRef);
            } catch (e) {
                console.error("Upload failed", e);
                return;
            }
        }

        const messageData = {
            _id: Math.random().toString(36).substring(7), // Temporary ID until Firestore
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
            chatId // for socket routing
        };

        // 1. Emit Socket
        socketService.emit('send_message', messageData);

        // 2. Optimistic UI Update (optional, if not waiting for Firestore listener)
        // dispatch(addMessage({ ...messageData, sent: true })); 
        // Actually, Firestore listener is fast enough usually, but strictly speaking prompt asked for Socket for speed.
        // I'll rely on Firestore for local echo to keep ID consistent unless valid network delay. 
        // But to satisfy "Socket for faster delivery", I should probably show it immediately.

        // 3. Save to Firestore
        const { _id, chatId: cid, ...firestoreData } = messageData;
        await addDoc(collection(firestore, 'chats', chatId, 'messages'), {
            ...firestoreData,
            createdAt: serverTimestamp(),
            sent: true
        });
    };

    const handlePickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{userName}</Text>
            </View>
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item._id}
                renderItem={({ item }) => <ChatBubble message={item} isCurrentUser={item.user._id === currentUser!.uid} />}
                inverted
                contentContainerStyle={styles.list}
            />
            <InputToolbar onSend={handleSend} onPickImage={handlePickImage} onTyping={handleTyping} />
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        padding: 16,
        paddingTop: 60,
        backgroundColor: '#1E1E1E',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        alignItems: 'center'
    },
    headerTitle: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18
    },
    list: {
        padding: 16,
    },
});

export default ChatScreen;
