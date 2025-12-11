import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync(userId: string) {
    console.log('registerForPushNotificationsAsync start', { userId, platform: Platform.OS, isDevice: Device.isDevice });
    let token: string | undefined;
    let expoPushToken: string | undefined;
    let devicePushToken: string | undefined;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    // iOS simulators cannot receive push; allow Android emulators to proceed
    if (Platform.OS === 'ios' && !Device.isDevice) {
        console.log('iOS simulator cannot receive push notifications');
        return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!', { finalStatus });
        return;
    }

    try {
        // Project ID from Constants or hardcoded if strictly needed, usually inferred
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ||
            Constants.easConfig?.projectId ||
            Constants.expoConfig?.extra?.projectId;

        // Only call Expo token if we have a valid EAS project UUID; otherwise skip to avoid 400 errors.
        const isUuid = projectId ? /^[0-9a-fA-F-]{36}$/.test(projectId) : false;
        if (isUuid) {
            expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
        devicePushToken = (await Notifications.getDevicePushTokenAsync()).data as string | undefined;

        console.log('Push tokens for user', userId, {
            projectId,
            expoPushToken,
            devicePushToken,
            finalStatus,
        });

        // Prefer native/device token for FCM/APNs, fall back to Expo token if present
        token = devicePushToken || expoPushToken;

        // Build payload omitting undefined values to satisfy Firestore
        const payload: Record<string, any> = {
            pushPlatform: Platform.OS,
        };
        if (token) payload.fcmToken = token;
        if (expoPushToken) payload.expoPushToken = expoPushToken;
        if (devicePushToken) payload.devicePushToken = devicePushToken;

        // Save to Firestore (merge to avoid overwriting profile data)
        await setDoc(doc(firestore, 'users', userId), payload, { merge: true });

    } catch (e) {
        console.error("Error fetching token", e);
    }

    return token;
}
