import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

export async function registerForPushNotificationsAsync(userId: string) {
    try {
        await messaging().registerDeviceForRemoteMessages();
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
            console.log('Push permission not granted', { authStatus });
            return;
        }

        const token = await messaging().getToken();
        if (!token) {
            console.log('No FCM token available');
            return;
        }

        const payload: Record<string, any> = {
            pushPlatform: Platform.OS,
            fcmToken: token,
            devicePushToken: token,
        };

        await setDoc(doc(firestore, 'users', userId), payload, { merge: true });
        return token;
    } catch (e) {
        console.error('Error fetching FCM token', e);
    }
}

export function subscribeToTokenRefresh(userId: string) {
    return messaging().onTokenRefresh(async (token) => {
        try {
            await setDoc(doc(firestore, 'users', userId), {
                pushPlatform: Platform.OS,
                fcmToken: token,
                devicePushToken: token,
            }, { merge: true });
        } catch (e) {
            console.error('Error updating FCM token', e);
        }
    });
}
