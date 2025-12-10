import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_t8746OE1bZoMjVA-FXtHHOIHfOE8JAo",
  authDomain: "chatapp-ccae8.firebaseapp.com",
  projectId: "chatapp-ccae8",
  storageBucket: "chatapp-ccae8.firebasestorage.app",
  messagingSenderId: "472937748430",
  appId: "1:472937748430:android:4572c20f29c445d0aefd9f"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const firestore = getFirestore(app);
const storage = getStorage(app);

export { auth, firestore, storage };
export default app;
