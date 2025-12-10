import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';
import { setUser, setLoading, setError } from '../store/slices/authSlice';
import { RootState } from '../store';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector((state: RootState) => state.auth);

    // Request
    const [request, response, promptAsync] = Google.useAuthRequest({
        // TODO: REPlACE WITH YOUR ACTUAL CLIENT ID FROM FIREBASE CONSOLE
        webClientId: '472937748430-4p245dojdpc4nqema2l14sb5ubvsuohs.apps.googleusercontent.com',
        iosClientId: '472937748430-qmbj603lfuar607g37mb87p0a0spirl5.apps.googleusercontent.com',
        androidClientId: '472937748430-4p245dojdpc4nqema2l14sb5ubvsuohs.apps.googleusercontent.com',
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            dispatch(setLoading(true));
            signInWithCredential(auth, credential)
                .then((userCredential) => {
                    // Logic duplicated from handleAuth, could be refactored
                    const user = userCredential.user;
                    const userData = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || 'Google User',
                        photoURL: user.photoURL,
                        isOnline: true,
                        lastSeen: serverTimestamp(),
                    };
                    setDoc(doc(firestore, 'users', user.uid), userData, { merge: true });
                    dispatch(setUser({
                        uid: user.uid,
                        email: user.email,
                        displayName: userData.displayName,
                        photoURL: userData.photoURL,
                    }));
                })
                .catch((error) => {
                    dispatch(setError(error.message));
                    Alert.alert('Google Login Error', error.message);
                })
                .finally(() => dispatch(setLoading(false)));
        }
    }, [dispatch, response]);

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

    const handleSocialLogin = (provider: string) => {
        if (provider === 'Google') {
            if (!request) {
                Alert.alert('Error', 'Google Login not ready. Check Client ID.');
                return;
            }
            promptAsync();
        } else {
            Alert.alert('Not Implemented', `${provider} login requires native configuration.`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue chatting</Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#aaa"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#aaa"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

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

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                    <Text style={styles.switchText}>
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.line} />
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#DB4437' }]} onPress={() => handleSocialLogin('Google')}>
                        <Text style={styles.socialButtonText}>G</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#4267B2' }]} onPress={() => handleSocialLogin('Facebook')}>
                        <Text style={styles.socialButtonText}>f</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Dark premium background
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginBottom: 48,
    },
    inputContainer: {
        gap: 16,
        marginBottom: 24,
    },
    input: {
        backgroundColor: '#1E1E1E',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        backgroundColor: '#6C63FF', // Primary accent color
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    errorText: {
        color: '#FF4444',
        marginBottom: 16,
        textAlign: 'center',
    },
    switchButton: {
        alignItems: 'center',
        marginBottom: 32,
    },
    switchText: {
        color: '#DDD',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
    },
    line: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    orText: {
        marginHorizontal: 16,
        color: '#666',
    },
    socialContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    socialButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialButtonText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
});

export default LoginScreen;
