import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './src/config/firebase';
import { setUser, setHydrated, logout } from './src/store/slices/authSlice';
import socketService from './src/services/socketService';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync } from './src/services/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import { store } from './src/store';
import * as Notifications from 'expo-notifications';
import { navigationRef } from './src/navigation/navigationRef';
import { useSelector } from 'react-redux';
import { RootState } from './src/store';
import { KeyboardProvider } from 'react-native-keyboard-controller';

// Keep splash screen visible until we decide to hide
SplashScreen.preventAutoHideAsync().catch(() => { });

// Component to handle auth state subscription
const AuthListener = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const pendingNavigation = useRef<{ userId: string, userName?: string } | null>(null);

  const tryNavigateToPendingChat = () => {
    if (!pendingNavigation.current) return;
    if (!isAuthenticated) return;
    if (!navigationRef.isReady()) {
      // Retry shortly until nav is ready
      setTimeout(() => tryNavigateToPendingChat(), 150);
      return;
    }
    const { userId, userName } = pendingNavigation.current;
    navigationRef.navigate('Chat' as never, { userId, userName: userName || 'Chat' } as never);
    pendingNavigation.current = null;
  };

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

  // Handle notification taps to deep link into Chat
  useEffect(() => {
    const responseSub = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data: any = response.notification.request.content.data;
      const chatId = data?.chatId;
      const userId = data?.senderId || data?.userId;
      let userName = data?.senderName || data?.userName;

      if (!chatId || !userId) return;

      try {
        if (!userName) {
          const snap = await getDoc(doc(firestore, 'users', userId));
          if (snap.exists()) {
            const data = snap.data() as any;
            userName = data.displayName || data.name || userName;
          }
        }
      } catch {
        // ignore lookup errors
      }

      pendingNavigation.current = { userId, userName };
      tryNavigateToPendingChat();
    });

    return () => {
      responseSub.remove();
    };
  }, [isAuthenticated]);

  // Attempt navigation once auth/nav become ready
  useEffect(() => {
    tryNavigateToPendingChat();
  }, [isAuthenticated]);

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
            lastSeen: serverTimestamp()
          }, { merge: true }).catch(e => console.error('Presence set online failed', e));
          socketService.emit('user_online', user.uid);
        } else {
          await setDoc(doc(firestore, 'users', user.uid), {
            isOnline: false,
            lastSeen: serverTimestamp()
          }, { merge: true }).catch(e => console.error('Presence set offline failed', e));
          socketService.emit('user_offline', user.uid);
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
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <AuthListener />
        <StatusBar style="light" />
      </KeyboardProvider>
    </Provider>
  );
}
