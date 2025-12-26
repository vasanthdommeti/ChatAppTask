import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  FlatList,
  TouchableOpacity,
  Image,
  Keyboard,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { KeyboardStickyView } from '../components/KeyboardController';
import { useDispatch, useSelector } from 'react-redux';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  increment,
  updateDoc
} from 'firebase/firestore';
import { firestore, storage } from '../config/firebase';
import socketService from '../services/socketService';
import InputToolbar from '../components/InputToolbar';
import ChatBubble from '../components/ChatBubble';
import ChatSkeleton from '../components/ChatSkeleton';
import { getDownloadURL, ref as storageRef, uploadString } from 'firebase/storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootState } from '../store';
import { addMessage, setMessages, updateMessageStatus } from '../store/slices/chatSlice';

const guessContentType = (uri?: string, provided?: string | null) => {
  if (provided && provided.startsWith('image/')) return provided;
  const ext = uri?.split('.').pop()?.toLowerCase() || '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

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
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const stickyOffset = useMemo(() => ({
    closed: -insets.bottom,
    opened: 0
  }), [insets.bottom]);

  if (!currentUser) {
    return null;
  }

  // canonical chat id
  const chatId = currentUser!.uid < userId ? `${currentUser!.uid}_${userId}` : `${userId}_${currentUser!.uid}`;

  useEffect(() => {
    setLoadingMessages(true);
    setIsTyping(false);
  }, [chatId]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const animateLayout = () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    };
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      animateLayout();
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      animateLayout();
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    socketService.connect();
    socketService.emit('join_chat', chatId);

    const handleReceiveMessage = (msg: any) => {
      if (msg.user._id !== currentUser!.uid) {
        socketService.emit('message_delivered', { messageId: msg._id, chatId });
        socketService.emit('message_seen', { messageId: msg._id, chatId });
        dispatch(addMessage({ ...msg, sent: true, received: true, seen: true }));

        updateDoc(doc(firestore, 'chats', chatId, 'messages', msg._id), {
          received: true,
          seen: true
        }).catch(() => { });
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

      updateDoc(doc(firestore, 'chats', chatId, 'messages', messageId), {
        sent: status === 'sent' || status === 'delivered' || status === 'seen',
        received: status === 'delivered' || status === 'seen',
        seen: status === 'seen'
      }).catch(() => { });
    };

    const handleMessageSent = ({ messageId, chatId: statusChatId }: any) => {
      if (statusChatId && statusChatId !== chatId) return;
      dispatch(updateMessageStatus({ _id: messageId, sent: true }));
      updateDoc(doc(firestore, 'chats', chatId, 'messages', messageId), { sent: true }).catch(() => { });
    };

    const handleUserTyping = ({ userId: uid, isTyping, chatId: typingChatId }: any) => {
      if (typingChatId && typingChatId !== chatId) return;
      if (uid === userId) {
        setIsTyping(Boolean(isTyping));
      }
    };

    socketService.on('receive_message', handleReceiveMessage);
    socketService.on('message_status_update', handleMessageStatusUpdate);
    socketService.on('message_sent', handleMessageSent);
    socketService.on('user_typing', handleUserTyping);

    const messagesRef = collection(firestore, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(docSnap => {
        const data: any = docSnap.data();
        return {
          _id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
          sent: data.sent ?? false,
          received: data.received ?? false,
          seen: data.seen ?? false,
        };
      }) as any[];
      dispatch(setMessages(msgs));
      setLoadingMessages(false);

      // mark as seen
      msgs.forEach(msg => {
        if (msg.user._id !== currentUser!.uid && !msg.seen) {
          socketService.emit('message_seen', { messageId: msg._id, chatId });
          updateDoc(doc(firestore, 'chats', chatId, 'messages', msg._id), {
            seen: true,
            received: true
          }).catch(() => { });
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
  }, [chatId, currentUser?.uid, dispatch, userId, userName, navigation]);

  // reset unread count
  useEffect(() => {
    const resetUnread = async () => {
      const chatRef = doc(firestore, 'chats', chatId);
      await setDoc(chatRef, {
        [`unreadCount_${currentUser!.uid}`]: 0
      }, { merge: true });
    };
    resetUnread();
  }, [chatId, currentUser]);

  const handleSend = async (text: string, image?: { uri: string; base64?: string | null; mimeType?: string | null }) => {
    if (!text.trim() && !image) return;
    let imageUrl = '';

    if (image) {
      console.log('Uploading image:', image.uri);
      const filename = image.uri.substring(image.uri.lastIndexOf('/') + 1) || `image-${Date.now()}.jpg`;
      const sRef = storageRef(storage, `images/${currentUser!.uid}/${Date.now()}-${filename}`);
      const contentType = guessContentType(image.uri, image.mimeType);

      try {
        // Strategy: Base64 String (Bypasses all Blob/ArrayBuffer issues)
        // Ensure image.base64 is present (react-native-image-picker provides it when requested).
        const base64Data = image.base64;
        if (!base64Data) {
          throw new Error('Missing image data.');
        }

        await uploadString(sRef, base64Data, 'base64', { contentType });
        imageUrl = await getDownloadURL(sRef);
      } catch (e: any) {
        console.error('Upload failed via Base64', {
          message: e?.message,
          code: e?.code,
          serverResponse: e?.serverResponse,
        });
        Alert.alert('Upload failed', 'Unable to upload image. Please try again.');
        return;
      }
    }

    const messageId = doc(collection(firestore, 'chats', chatId, 'messages')).id;

    const messageData = {
      _id: messageId,
      text: text || '',
      createdAt: Date.now(),
      user: {
        _id: currentUser!.uid,
        name: currentUser!.displayName || 'User',
        avatar: currentUser!.photoURL,
      },
      image: imageUrl,
      sent: false,
      received: false,
      seen: false,
      chatId
    };

    // optimistic UI
    dispatch(addMessage(messageData as any));

    // emit socket
    socketService.emit('send_message', { ...messageData, recipientId: userId });

    // save to firestore
    const { _id, chatId: cid, ...firestoreData } = messageData as any;
    await setDoc(doc(firestore, 'chats', chatId, 'messages', messageId), {
      ...firestoreData,
      createdAt: serverTimestamp(),
      sent: false,
      received: false,
      seen: false
    });

    // update chat summary/unread
    const chatRef = doc(firestore, 'chats', chatId);
    await setDoc(chatRef, {
      lastMessage: image ? '📷 Image' : text,
      lastMessageTime: serverTimestamp(),
      participants: [currentUser!.uid, userId],
      [`unreadCount_${userId}`]: increment(1)
    }, { merge: true });
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      includeBase64: true,
      quality: 0.6,
    });

    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Image Picker Error', result.errorMessage || 'Unable to pick image.');
      return;
    }

    const asset = result.assets?.[0];
    if (asset?.uri && asset.base64) {
      handleSend('', {
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.type
      });
    } else {
      Alert.alert('Image Error', 'Unable to read image data.');
    }
  };

  const handleTyping = (text: string) => {
    socketService.emit('typing', { chatId, userId: currentUser!.uid, isTyping: text.length > 0 });
  };

  const otherUser = useMemo(() => users.find(u => u.uid === userId), [users, userId]);
  const displayName = userName || otherUser?.displayName || 'Chat';
  const avatarUri = otherUser?.photoURL;
  const avatarInitial = displayName?.trim()?.charAt(0)?.toUpperCase() || '?';
  const subtitle = useMemo(() => {
    if (otherUser?.isOnline) return 'Online';
    const lastSeenRaw: any = otherUser?.lastSeen;
    const lastSeenMs = typeof lastSeenRaw === 'number' ? lastSeenRaw : lastSeenRaw?.toMillis?.();
    if (lastSeenMs) {
      const date = new Date(lastSeenMs);
      const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      return `Last seen ${isToday ? 'today' : date.toLocaleDateString()} ${time}`;
    }
    return '';
  }, [otherUser]);
  const statusText = isTyping ? 'typing...' : subtitle;
  const keyboardOpen = keyboardHeight > 0;
  const keyboardPadding = keyboardOpen ? keyboardHeight : insets.bottom;
  const listPaddingTop = inputHeight + keyboardPadding + (keyboardOpen ? 26 : 12);

  useEffect(() => {
    if (!keyboardOpen) return;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    });
  }, [keyboardOpen, keyboardHeight, inputHeight]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
            {statusText ? <Text style={styles.headerSubtitle}>{statusText}</Text> : null}
          </View>
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
            contentContainerStyle={[styles.list, { paddingTop: listPaddingTop }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
          />
        )}
      </View>

      <KeyboardStickyView offset={stickyOffset} style={styles.inputSticky}>
        <View
          style={styles.inputWrapper}
          onLayout={(e) => setInputHeight(e.nativeEvent.layout.height)}
        >
          <InputToolbar
            onSend={handleSend}
            onPickImage={handlePickImage}
            onTyping={handleTyping}
            keyboardOpen={keyboardOpen}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#202C33',
    borderBottomWidth: 1,
    borderBottomColor: '#1F2A30',
    zIndex: 10,
  },
  backButton: {
    paddingRight: 6,
    paddingVertical: 4,
    marginRight: 2,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#2A3942',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#2A3942',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#E9EDEF',
    fontWeight: '700',
    fontSize: 14,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#E9EDEF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerSubtitle: {
    color: '#8696A0',
    fontSize: 11,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  inputWrapper: {
    backgroundColor: '#0B141A',
    borderTopWidth: 1,
    borderTopColor: '#1F2A30',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 8,
  },
  flexContainer: {
    flex: 1,
  },
});

export default ChatScreen;
