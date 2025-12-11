import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { logout } from '../store/slices/authSlice';
import { setActiveChat, setMessages } from '../store/slices/chatSlice';
import { clearUsers } from '../store/slices/usersSlice';
import socketService from '../services/socketService';
import { auth, firestore } from '../config/firebase';
import { RootState } from '../store';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const ProfileScreen = () => {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const user = useSelector((state: RootState) => state.auth.user);

    const avatarUri = useMemo(() => {
        if (user?.photoURL) return user.photoURL;
        const name = user?.displayName || 'User';
        return `https://ui-avatars.com/api/?background=1A1A1A&color=fff&name=${encodeURIComponent(name)}`;
    }, [user?.displayName, user?.photoURL]);

    const handleLogout = async () => {
        dispatch(logout());
        dispatch(setActiveChat(null));
        dispatch(setMessages([]));
        dispatch(clearUsers());
        socketService.disconnect();

        if (user?.uid) {
            setDoc(doc(firestore, 'users', user.uid), {
                isOnline: false,
                lastSeen: serverTimestamp()
            }, { merge: true }).catch(err => console.error("Failed to set offline:", err));
        }

        auth.signOut().catch((error) => {
            console.error("Logout error:", error);
            Alert.alert("Logout Error", "We signed you out locally but failed to sign out of Firebase.");
        });
    };

    if (!user) {
        return null;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.card}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                <Text style={styles.name}>{user.displayName || 'Anonymous'}</Text>
                <Text style={styles.email}>{user.email}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.row}>
                    <Ionicons name="person-circle-outline" size={20} color="#AAA" />
                    <Text style={styles.label}>User ID</Text>
                </View>
                <Text style={styles.value}>{user.uid}</Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
        paddingHorizontal: 20,
        gap: 20,
    },
    card: {
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        marginBottom: 12,
        backgroundColor: '#2A2A2A',
    },
    name: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    email: {
        color: '#AAA',
        fontSize: 14,
    },
    section: {
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        color: '#DDD',
        fontSize: 14,
        fontWeight: '600',
    },
    value: {
        color: '#AAA',
        fontSize: 13,
        letterSpacing: 0.3,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF4444',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    logoutText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default ProfileScreen;
