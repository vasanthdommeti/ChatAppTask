import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

    const displayName = user.displayName || 'Anonymous';
    const email = user.email || '';

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.heroCard}>
                <View style={styles.heroGlow} />
                <View style={styles.heroRow}>
                    <View style={styles.avatarRing}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    </View>
                    <View style={styles.heroText}>
                        <Text style={styles.name}>{displayName}</Text>
                        {email ? (
                            <View style={styles.metaRow}>
                                <Ionicons name="mail-outline" size={14} color="#8696A0" />
                                <Text style={styles.email} numberOfLines={1}>{email}</Text>
                            </View>
                        ) : null}
                        <View style={styles.idPill}>
                            <Ionicons name="key-outline" size={13} color="#9FB0BA" />
                            <Text style={styles.idText} selectable numberOfLines={1}>{user.uid}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="person-outline" size={18} color="#9FB0BA" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Display name</Text>
                        <Text style={styles.detailValue}>{displayName}</Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="mail-outline" size={18} color="#9FB0BA" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{email || 'Not provided'}</Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                        <Ionicons name="finger-print-outline" size={18} color="#9FB0BA" />
                    </View>
                    <View style={styles.detailText}>
                        <Text style={styles.detailLabel}>User ID</Text>
                        <Text style={styles.detailValue} selectable>{user.uid}</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutCard} onPress={handleLogout}>
                <View style={styles.logoutRow}>
                    <Ionicons name="log-out-outline" size={18} color="#FFB4B4" />
                    <Text style={styles.logoutText}>Log out</Text>
                </View>
                <Text style={styles.logoutHint}>End this session on this device.</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B141A',
    },
    content: {
        paddingHorizontal: 20,
        gap: 20,
    },
    heroCard: {
        backgroundColor: '#101A22',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1C2A33',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 6,
    },
    heroGlow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: '#1B2A33',
        top: -90,
        right: -60,
        opacity: 0.8,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarRing: {
        padding: 3,
        borderRadius: 52,
        borderWidth: 2,
        borderColor: '#25D366',
        backgroundColor: '#0B141A',
    },
    avatar: {
        width: 86,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#2A2A2A',
    },
    heroText: {
        flex: 1,
    },
    name: {
        color: '#E9EDEF',
        fontSize: 22,
        fontWeight: '700',
    },
    email: {
        color: '#8FA1AC',
        fontSize: 13,
        flexShrink: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    idPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1B2A33',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#22323B',
    },
    idText: {
        color: '#C7D3DC',
        fontSize: 12,
    },
    section: {
        backgroundColor: '#101A22',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1C2A33',
        gap: 12,
    },
    sectionTitle: {
        color: '#8FA1AC',
        fontSize: 12,
        letterSpacing: 1.4,
        fontWeight: '700',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    detailIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#1B2A33',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#22323B',
    },
    detailText: {
        flex: 1,
    },
    detailLabel: {
        color: '#A9B5BE',
        fontSize: 12,
        letterSpacing: 0.3,
    },
    detailValue: {
        color: '#E1E7EC',
        fontSize: 15,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#1E2A32',
    },
    logoutCard: {
        backgroundColor: '#2A1313',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#4A1F1F',
        padding: 16,
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoutText: {
        color: '#FFB4B4',
        fontWeight: '700',
        fontSize: 16,
    },
    logoutHint: {
        color: '#D6A1A1',
        fontSize: 12,
        marginTop: 6,
    },
});

export default ProfileScreen;
