import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { firestore } from '../config/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { auth } from '../config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import socketService from '../services/socketService';
import { setUsers, clearUsers } from '../store/slices/usersSlice';
import { logout } from '../store/slices/authSlice';
import { setActiveChat, setMessages } from '../store/slices/chatSlice';
import { RootState } from '../store';

const UsersListScreen = ({ navigation }: any) => {
    const dispatch = useDispatch();
    const users = useSelector((state: RootState) => state.users.users);
    const currentUser = useSelector((state: RootState) => state.auth.user);

    useEffect(() => {
        // Real-time listener for users
        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList: any[] = [];
            snapshot.forEach((doc) => {
                if (doc.id !== currentUser?.uid) {
                    usersList.push({ ...doc.data(), uid: doc.id });
                }
            });
            dispatch(setUsers(usersList));
        });

        return () => unsubscribe();
    }, [currentUser?.uid, dispatch]);

    const handleLogout = async () => {
        // Instant local logout so UI flips even if network is down
        dispatch(logout());
        dispatch(setActiveChat(null));
        dispatch(setMessages([]));
        dispatch(clearUsers());
        socketService.disconnect();

        if (currentUser?.uid) {
            updateDoc(doc(firestore, 'users', currentUser.uid), {
                isOnline: false,
                lastSeen: serverTimestamp()
            }).catch(err => console.error("Failed to set offline:", err));
        }

        auth.signOut().catch((error) => {
            console.error("Logout error:", error);
            Alert.alert("Logout Error", "We signed you out locally but failed to sign out of Firebase.");
        });
    };

    const renderItem = ({ item }: any) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => navigation.navigate('Chat', { userId: item.uid, userName: item.displayName })}
        >
            <Image source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }} style={styles.avatar} />
            <View style={styles.info}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.status}>
                    {item.isOnline ? 'Online' : 'Offline'}
                </Text>
            </View>
            <View style={[styles.indicator, { backgroundColor: item.isOnline ? '#4CAF50' : '#888' }]} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Chats</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={item => item.uid}
                contentContainerStyle={styles.list}
            />
        </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    logoutText: {
        color: '#FF4444',
    },
    list: {
        padding: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    status: {
        color: '#888',
        fontSize: 12,
    },
    indicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});

export default UsersListScreen;
