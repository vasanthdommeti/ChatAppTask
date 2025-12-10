import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function registerForPushNotificationsAsync(userId: string) {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        // Get the token that identifies this device
        // Note: In a bare workflow or custom dev client you might need getDevicePushTokenAsync
        // For Expo Go / EAS Build, getExpoPushTokenAsync is common but for FCM strictly we want getDevicePushTokenAsync sometimes
        // But since using generic Firebase Cloud Messaging, we usually want the FCM token.
        // Expo's getDevicePushTokenAsync returns the native FCM token on Android.

        try {
            // Project ID from Constants or hardcoded if strictly needed, usually inferred
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

            // Save to Firestore
            await updateDoc(doc(firestore, 'users', userId), {
                fcmToken: token
            });

        } catch (e) {
            console.error("Error fetching token", e);
        }

    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
