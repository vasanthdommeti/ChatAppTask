import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './src/config/firebase';
import { setUser, setHydrated, logout } from './src/store/slices/authSlice';
import socketService from './src/services/socketService';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import { store } from './src/store';

// Keep splash screen visible until we decide to hide
SplashScreen.preventAutoHideAsync().catch(() => { });

// Component to handle auth state subscription
const AuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Hydration should not wait on network calls
      dispatch(setHydrated(true));

      if (!user) {
        dispatch(logout());
        socketService.disconnect();
        return;
      }

      dispatch(setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }));

      // Connect Socket (idempotent)
      socketService.connect();
      socketService.emit('user_online', user.uid);

      // Update persistence
      await setDoc(doc(firestore, 'users', user.uid), {
        isOnline: true
      }, { merge: true }).catch(e => console.error('Presence update failed', e));

      // Register for push notifications (do not block UI)
      registerForPushNotificationsAsync(user.uid).catch(e => console.error('Push registration failed', e));
    });

    return () => unsubscribe();
  }, [logout, setHydrated, setUser]);

  // Fallback to avoid getting stuck on loader if auth listener never fires
  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(setHydrated(true));
    }, 5000);
    return () => clearTimeout(timeout);
  }, [dispatch]);

  // App State Listener for Presence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const user = auth.currentUser;
      if (user) {
        if (nextAppState === 'active') {
          await setDoc(doc(firestore, 'users', user.uid), {
            isOnline: true,
          }, { merge: true });
          socketService.emit('user_online', user.uid);
        } else {
          await setDoc(doc(firestore, 'users', user.uid), {
            isOnline: false,
            lastSeen: serverTimestamp()
          }, { merge: true });
          // Optional: disconnect socket or keep it open for background (iOS limits this)
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <AppNavigator />;
};

export default function App() {
  return (
    <Provider store={store}>
      <AuthListener />
      <StatusBar style="light" />
    </Provider>
  );
}
