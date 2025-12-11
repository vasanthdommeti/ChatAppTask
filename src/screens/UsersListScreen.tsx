import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { firestore } from '../config/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import socketService from '../services/socketService';
import { setUsers, updateUserPresence, setUnreadTotal } from '../store/slices/usersSlice';
import { RootState } from '../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatListSkeleton from '../components/ChatListSkeleton';
import { useRef } from 'react';

const UsersListScreen = ({ navigation }: any) => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const users = useSelector((state: RootState) => state.users.users);
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const loadStartRef = useRef<number | null>(null);
    const [chatData, setChatData] = React.useState<any>({});
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [firstSnapshotReceived, setFirstSnapshotReceived] = useState(false);
    const [emptyDelayElapsed, setEmptyDelayElapsed] = useState(false);
    const emptyTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Real-time listener for users
        setLoadingUsers(true);
        setFirstSnapshotReceived(false);
        setEmptyDelayElapsed(false);
        if (emptyTimer.current) {
            clearTimeout(emptyTimer.current);
            emptyTimer.current = null;
        }
        loadStartRef.current = Date.now();
        console.log('[UsersList] start listening', { uid: currentUser?.uid, at: loadStartRef.current });
        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (emptyTimer.current) {
                clearTimeout(emptyTimer.current);
                emptyTimer.current = null;
            }
            const usersList: any[] = [];
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser?.uid) {
                    usersList.push({ ...doc.data(), uid: doc.id });
                }
            });
            const took = loadStartRef.current ? Date.now() - loadStartRef.current : null;
            console.log('[UsersList] snapshot', { count: usersList.length, tookMs: took });
            dispatch(setUsers(usersList));
            setLoadingUsers(false);
            setFirstSnapshotReceived(true);
            if (usersList.length === 0) {
                // Delay empty state to avoid flicker before data arrives
                setEmptyDelayElapsed(false);
                emptyTimer.current = setTimeout(() => setEmptyDelayElapsed(true), 8000);
                console.log('[UsersList] scheduled empty state in 8000ms');
            } else {
                setEmptyDelayElapsed(false);
            }
        });

        // Socket listener for real-time status updates
        socketService.on('status_update', ({ userId: uid, isOnline, lastSeen }) => {
            dispatch(updateUserPresence({ uid, isOnline, lastSeen }));
        });

        return () => {
            unsubscribe();
            socketService.off('status_update');
            if (emptyTimer.current) {
                clearTimeout(emptyTimer.current);
                emptyTimer.current = null;
            }
        };
    }, [currentUser?.uid, dispatch]);

    // Listen for Chat Metadata (Last Message, Unread)
    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(collection(firestore, 'chats'), where('participants', 'array-contains', currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: any = {};
            let unreadTotal = 0;
            snapshot.forEach(doc => {
                const chat = doc.data();
                const key = `unreadCount_${currentUser.uid}`;
                const unread = typeof chat[key] === 'number' ? chat[key] : 0;
                unreadTotal += unread;
                data[doc.id] = chat;
            });
            setChatData(data);
            dispatch(setUnreadTotal(unreadTotal));
        });
        return () => unsubscribe();
    }, [currentUser?.uid, dispatch]);

    const renderItem = ({ item }: any) => {
        if (!currentUser) return null;
        const chatId = currentUser.uid < item.uid
            ? `${currentUser!.uid}_${item.uid}`
            : `${item.uid}_${currentUser!.uid}`;
        const chat = chatData[chatId];
        const unreadCount = chat ? chat[`unreadCount_${currentUser!.uid}`] || 0 : 0;
        const lastMessage = chat ? chat.lastMessage : '';
        const lastTime = chat?.lastMessageTime ? new Date(chat.lastMessageTime.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => navigation.navigate('Chat', { userId: item.uid, userName: item.displayName })}
            >
                <Image source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }} style={styles.avatar} />
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{item.displayName}</Text>
                        {lastTime ? <Text style={styles.time}>{lastTime}</Text> : null}
                    </View>

                    <View style={styles.messageRow}>
                        <Text style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>
                            {lastMessage}
                        </Text>
                        {unreadCount > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={[styles.indicator, { backgroundColor: item.isOnline ? '#4CAF50' : '#888' }]} />
            </TouchableOpacity>
        );
    };

    const showSkeleton = loadingUsers || !firstSnapshotReceived || (users.length === 0 && !emptyDelayElapsed);
    const showEmpty = users.length === 0 && emptyDelayElapsed;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats</Text>
            </View>
            {showSkeleton ? (
                <ChatListSkeleton />
            ) : (
                <>
                    {showEmpty ? (
                        <View style={[styles.list, styles.emptyState]}>
                            <Text style={styles.emptyText}>No users yet. Invite someone to start chatting.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            renderItem={renderItem}
                            keyExtractor={item => item.uid}
                            contentContainerStyle={styles.list}
                        />
                    )}
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },
    logoutButton: {
        padding: 8,
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
    },
    list: {
        padding: 16,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    emptyText: {
        color: '#888',
        fontSize: 14,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 16,
        backgroundColor: '#333',
    },
    info: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    messageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        color: '#888',
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    lastMessageUnread: {
        color: '#fff',
        fontWeight: '600',
    },
    time: {
        color: '#666',
        fontSize: 12,
    },
    badge: {
        backgroundColor: '#6C63FF',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    status: {
        color: '#888',
        fontSize: 12,
    },
    indicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#1A1A1A',
    },
});

export default UsersListScreen;
