# ChatApp

React Native (Expo) 1:1 chat app with Firebase Auth/Firestore/Storage and a Socket.io presence + delivery layer. Supports email/password, Google, and Facebook login, media uploads, read receipts, typing indicators, push notifications, and unread badges.

## Features
- Authentication: email/password plus Google OAuth (Facebook scaffolded) with persisted sessions.
- Realtime chat: Firestore-backed messages with Socket.io delivery/typing events, unread counts, and read/delivered indicators.
- Media sharing: gallery image picker, base64 uploads to Firebase Storage, and inline image rendering.
- Presence and metadata: online/last seen state, last message/time per chat, and tab badge for total unread.
- Push notifications: Expo Notifications wired for device/Expo push tokens; server sends FCM when possible.
- UX polish: skeleton placeholders, typing state in header, keyboard-aware input bar, and dark theme styling.

## Stack
- Expo SDK 54 / React Native 0.81 / React 19
- Firebase Auth, Firestore, Storage
- Socket.io client + Node.js Socket.io server
- Redux Toolkit for state, react-navigation for routing, expo-notifications, expo-image-picker

## Project Structure
- `App.tsx` – bootstrap, auth listener, presence handling, notification deep links.
- `src/navigation/` – stack + bottom tabs, navigation ref for deep links.
- `src/screens/` – `LoginScreen`, `UsersListScreen`, `ChatScreen`, `ProfileScreen`.
- `src/components/` – chat bubbles, skeletons, input toolbar.
- `src/services/` – `socketService.ts` (Socket.io client), `notificationService.ts`.
- `src/store/` – Redux store and slices (`auth`, `chat`, `users`).
- `server/` – Socket.io + Firebase Admin push bridge.

## Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm i -g expo-cli`) and a device/emulator/simulator
- Firebase project with Auth, Firestore, and Storage enabled
- For native builds: Android Studio/Xcode with configured SDKs

## Setup (mobile app)
1) Install deps: `npm install` (from repo root).  
2) Firebase config: update `src/config/firebase.ts` with your project keys.  
3) Native Firebase files: place your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) in the repo root (paths referenced in `app.json`).  
4) Google OAuth: in `src/screens/LoginScreen.tsx`, replace the `Google.useAuthRequest` client IDs with the Web/iOS/Android client IDs from your Firebase project.  
5) Facebook login (optional): in `app.json` update the `react-native-fbsdk-next` plugin values (`appID`, `clientToken`, `displayName`, `scheme`) and ensure the Facebook app config matches your bundle IDs.  
6) Socket URL: in `src/services/socketService.ts` set `SOCKET_URL` to your machine’s IP if testing on a device (use `10.0.2.2` for Android emulator).  
7) Start Expo: `npm start` (or `npm run android` / `npm run ios` / `npm run web`).

## Socket/Push Server
1) `cd server && npm install`.  
2) Add `server/serviceAccountKey.json` (Firebase service account with messaging access).  
3) Run the server: `node index.js` (defaults to port 3000). Keep this running for presence, typing, read receipts, and push dispatches.  
4) If hosting elsewhere, update `SOCKET_URL` in `src/services/socketService.ts`.

## Push Notifications
- Uses `expo-notifications`; `notificationService.ts` writes device/Expo tokens to each `users` doc.  
- Ensure `extra.projectId` in `app.json` matches your EAS project ID (UUID) so Expo push tokens resolve.  
- iOS simulators cannot receive push; test on device. Android requires the notification channel configured in code.

## Firestore Data Model (simplified)
- `users/{uid}`: `displayName`, `email`, `photoURL`, `isOnline`, `lastSeen`, `fcmToken`/`expoPushToken`/`devicePushToken`.  
- `chats/{chatId}`: `participants`, `lastMessage`, `lastMessageTime`, `unreadCount_{uid}` per participant.  
- `chats/{chatId}/messages/{messageId}`: `text`, `image`, `user`, `createdAt`, `sent`, `received`, `seen`.

## Scripts
- `npm start` – Expo dev server  
- `npm run android` / `npm run ios` / `npm run web` – platform targets

## Tips
- Physical devices need the Socket.io URL pointed to your LAN IP.  
- Media uploads rely on `expo-blob`; leave the import in `index.ts`/`ChatScreen.tsx`.  
- If unread badges look off, confirm `chats` documents include `unreadCount_{uid}` fields for both participants.
