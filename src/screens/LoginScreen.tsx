import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithCredential } from 'firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { RootState } from '../store';

const LoginScreen = () => {
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [sdkInitializing, setSdkInitializing] = useState(true);
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        GoogleSignin.configure({
            // TODO: REPLACE WITH YOUR ACTUAL CLIENT ID FROM FIREBASE CONSOLE
            webClientId: '472937748430-4p245dojdpc4nqema2l14sb5ubvsuohs.apps.googleusercontent.com',
            iosClientId: '472937748430-qmbj603lfuar607g37mb87p0a0spirl5.apps.googleusercontent.com',
            offlineAccess: false,
        });
        setSdkInitializing(false);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => setSdkInitializing(false), 2000);
        return () => clearTimeout(timeout);
    }, []);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        try {
            dispatch(setLoading(true));
            let userCredential;
            if (isLogin) {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            }

            const user = userCredential.user;

            // Save user to Firestore
            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || email.split('@')[0],
                photoURL: user.photoURL || 'https://ui-avatars.com/api/?name=' + (user.displayName || 'User'),
                isOnline: true,
                lastSeen: serverTimestamp(),
            };

            await setDoc(doc(firestore, 'users', user.uid), userData, { merge: true });

            dispatch(setUser({
                uid: user.uid,
                email: user.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
            }));

        } catch (err: any) {
            dispatch(setError(err.message));
            Alert.alert('Authentication Error', err.message);
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleSocialLogin = async (provider: string) => {
        if (provider === 'Google') {
            try {
                dispatch(setLoading(true));
                if (Platform.OS === 'android') {
                    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
                }
                const userInfo = await GoogleSignin.signIn();
                let idToken = userInfo.idToken;
                let accessToken: string | undefined;

                if (!idToken) {
                    const tokens = await GoogleSignin.getTokens().catch(() => null);
                    if (tokens) {
                        idToken = tokens.idToken;
                        accessToken = tokens.accessToken;
                    }
                }

                if (!idToken && !accessToken) {
                    throw new Error('Missing Google ID token');
                }

                const credential = GoogleAuthProvider.credential(idToken || undefined, accessToken);
                const userCredential = await signInWithCredential(auth, credential);
                const user = userCredential.user;

                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Google User',
                    photoURL: user.photoURL,
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                };

                await setDoc(doc(firestore, 'users', user.uid), userData, { merge: true });
                dispatch(setUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: userData.displayName,
                    photoURL: userData.photoURL,
                }));
            } catch (error: any) {
                if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
                    return;
                }
                dispatch(setError(error.message));
                Alert.alert('Google Login Error', error.message || 'Unable to sign in.');
            } finally {
                dispatch(setLoading(false));
            }
        } else if (provider === 'Facebook') {
            try {
                const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
                if (result.isCancelled) {
                    return;
                }

                const data = await AccessToken.getCurrentAccessToken();
                if (!data) {
                    throw new Error('Something went wrong obtaining access token');
                }

                dispatch(setLoading(true));
                const credential = FacebookAuthProvider.credential(data.accessToken);
                const userCredential = await signInWithCredential(auth, credential);

                const user = userCredential.user;
                const userData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || 'Facebook User',
                    photoURL: user.photoURL + '?height=500', // standard generic fb graph param
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                };

                await setDoc(doc(firestore, 'users', user.uid), userData, { merge: true });

                dispatch(setUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: userData.displayName,
                    photoURL: userData.photoURL,
                }));

            } catch (error: any) {
                dispatch(setError(error.message));
                Alert.alert('Facebook Login Error', error.message);
            } finally {
                dispatch(setLoading(false));
            }
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {sdkInitializing && (
                <View style={styles.sdkOverlay}>
                    <View style={styles.sdkSpinner}>
                        <ActivityIndicator size="large" color="#6C63FF" />
                        <Text style={styles.sdkText}>Initializing Google & Facebook</Text>
                    </View>
                </View>
            )}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>{isLogin ? 'Sign in to your account' : 'Create a new account'}</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {error && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={16} color="#FF4444" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleAuth}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.orText}>Or continue with</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.socialContainer}>
                        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Google')}>
                            <Ionicons name="logo-google" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Facebook')}>
                            <Ionicons name="logo-facebook" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.footer}>
                    <Text style={styles.footerText}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Text style={styles.footerLink}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        marginBottom: 40,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        fontWeight: '500',
    },
    form: {
        gap: 16,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#2A2A2A',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    button: {
        backgroundColor: '#6C63FF',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 8,
    },
    errorText: {
        color: '#FF4444',
        fontSize: 14,
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 32,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    orText: {
        marginHorizontal: 16,
        color: '#666',
        fontSize: 14,
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    socialButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1A1A1A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    },
    footerText: {
        color: '#888',
        fontSize: 14,
    },
    footerLink: {
        color: '#6C63FF',
        fontWeight: '700',
    },
    sdkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    sdkSpinner: {
        backgroundColor: '#1A1A1A',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    sdkText: {
        color: '#fff',
        marginTop: 12,
        fontWeight: '600',
    }
});

export default LoginScreen;
