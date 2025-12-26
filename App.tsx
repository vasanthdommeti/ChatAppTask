import React, { useEffect, useRef } from 'react';
import { AppState, StatusBar, StyleSheet, View } from 'react-native';
import { Provider, useDispatch } from 'react-redux';
import AppNavigator from './src/navigation/AppNavigator';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from './src/config/firebase';
import { setUser, setHydrated, logout } from './src/store/slices/authSlice';
import socketService from './src/services/socketService';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { registerForPushNotificationsAsync, subscribeToTokenRefresh } from './src/services/notificationService';
import { store } from './src/store';
import { navigationRef } from './src/navigation/navigationRef';
import { useSelector } from 'react-redux';
import { RootState } from './src/store';
import { KeyboardProvider } from './src/components/KeyboardController';
import messaging from '@react-native-firebase/messaging';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Component to handle auth state subscription
const AuthListener = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const pendingNavigation = useRef<{ userId: string, userName?: string } | null>(null);
  const tokenRefreshUnsub = useRef<null | (() => void)>(null);

  const tryNavigateToPendingChat = () => {
    if (!pendingNavigation.current) return;
    if (!isAuthenticated) return;
    if (!navigationRef.isReady()) {
      // Retry shortly until nav is ready
      setTimeout(() => tryNavigateToPendingChat(), 150);
      return;
    }
    const { userId, userName } = pendingNavigation.current;
    navigationRef.navigate('Chat', { userId, userName: userName || 'Chat' });
    pendingNavigation.current = null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        dispatch(logout());
        socketService.disconnect();
        if (tokenRefreshUnsub.current) {
          tokenRefreshUnsub.current();
          tokenRefreshUnsub.current = null;
        }
        dispatch(setHydrated(true));
        return;
      }

      dispatch(setUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }));
      dispatch(setHydrated(true));

      // Connect Socket (idempotent)
      socketService.connect();
      socketService.emit('user_online', user.uid);

      // Update persistence
      await setDoc(doc(firestore, 'users', user.uid), {
        isOnline: true
      }, { merge: true }).catch(e => console.error('Presence update failed', e));

      // Register for push notifications (do not block UI)
      registerForPushNotificationsAsync(user.uid).catch(e => console.error('Push registration failed', e));
      if (tokenRefreshUnsub.current) {
        tokenRefreshUnsub.current();
      }
      tokenRefreshUnsub.current = subscribeToTokenRefresh(user.uid);
    });

    return () => unsubscribe();
  }, [logout, setHydrated, setUser]);

  // Handle notification taps to deep link into Chat
  useEffect(() => {
    const handleOpen = async (data: any) => {
      const chatId = data?.chatId;
      const userId = data?.senderId || data?.userId;
      let userName = data?.senderName || data?.userName;

      if (!chatId || !userId) return;

      try {
        if (!userName) {
          const snap = await getDoc(doc(firestore, 'users', userId));
          if (snap.exists()) {
            const userData = snap.data() as any;
            userName = userData.displayName || userData.name || userName;
          }
        }
      } catch {
        // ignore lookup errors
      }

      pendingNavigation.current = { userId, userName };
      tryNavigateToPendingChat();
    };

    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage?.data) {
        handleOpen(remoteMessage.data);
      }
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          handleOpen(remoteMessage.data);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribeOpened();
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
        <SafeAreaProvider>
          <View style={styles.appRoot}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <AuthListener />
          </View>
        </SafeAreaProvider>
      </KeyboardProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
});
