# ChatApp (React Native CLI)

React Native CLI 1:1 chat app with Firebase Auth/Firestore/Storage and a Socket.io presence + delivery layer. Supports email/password, Google, and Facebook login, media uploads, read receipts, typing indicators, and unread badges. Push notifications are handled via FCM with `@react-native-firebase/messaging`.

## Features
- Authentication: email/password plus Google and Facebook login with persisted sessions.
- Realtime chat: Firestore-backed messages with Socket.io delivery/typing events and read receipts.
- Media sharing: gallery image picker with base64 uploads to Firebase Storage.
- Presence and metadata: online/last seen state, last message/time per chat, unread counts.
- Push notifications: FCM device tokens saved to each `users` doc, server sends FCM.
- UX polish: skeleton placeholders, typing state in header, keyboard-aware input bar, dark theme.

## Stack
- React Native 0.83 / React 19
- Firebase Auth, Firestore, Storage (Web SDK)
- FCM via `@react-native-firebase/messaging`
- Socket.io client + Node.js Socket.io server
- Redux Toolkit, react-navigation

## Project Structure
- `App.tsx` – bootstrap, auth listener, presence handling, notification deep links.
- `src/navigation/` – stack + bottom tabs, navigation ref for deep links.
- `src/screens/` – `LoginScreen`, `UsersListScreen`, `ChatScreen`, `ProfileScreen`.
- `src/components/` – chat bubbles, skeletons, input toolbar.
- `src/services/` – `socketService.ts`, `notificationService.ts`.
- `src/store/` – Redux store and slices (`auth`, `chat`, `users`).
- `server/` – Socket.io + Firebase Admin push bridge.

## Prerequisites
- Node.js 20+
- Android Studio/Xcode configured for RN CLI
- Firebase project with Auth, Firestore, Storage enabled

## Setup (mobile app)
1) Install deps: `npm install` (repo root).  
2) Firebase config: update `src/config/firebase.ts` with your project keys.  
3) Native Firebase files:  
   - Android: `android/app/google-services.json`  
   - iOS: `ios/ChatAppRN/GoogleService-Info.plist`  
   These are already placed for `com.vasanthdommeti9999.chatappexpo`. If you change the bundle/package ID, re-download these files from Firebase.  
4) Google login:
   - Ensure the OAuth client IDs in `src/screens/LoginScreen.tsx` are correct.
   - iOS: `CFBundleURLSchemes` includes the reversed client ID (already added).  
5) Facebook login:
   - Update `facebook_app_id` and `facebook_client_token` in `android/app/src/main/res/values/strings.xml`.
   - Update `FacebookAppID` and `FacebookClientToken` in `ios/ChatAppRN/Info.plist`.
   - Ensure your Facebook app is configured with the same bundle/package IDs.  
6) Socket URL: `src/services/socketService.ts` (use `10.0.2.2` for Android emulator).  

## Run the app
```sh
npm start
```

### Android
```sh
npm run android
```

### iOS
```sh
bundle install
bundle exec pod install
npm run ios
```

## Socket/Push Server
1) `cd server && npm install`.  
2) Add `server/serviceAccountKey.json` (Firebase service account).  
3) Run: `node index.js` (port 3000).  
4) If hosting elsewhere, update `SOCKET_URL` in `src/services/socketService.ts`.

## Firestore Data Model (simplified)
- `users/{uid}`: `displayName`, `email`, `photoURL`, `isOnline`, `lastSeen`, `fcmToken`.  
- `chats/{chatId}`: `participants`, `lastMessage`, `lastMessageTime`, `unreadCount_{uid}`.  
- `chats/{chatId}/messages/{messageId}`: `text`, `image`, `user`, `createdAt`, `sent`, `received`, `seen`.

## Notes
- iOS push notifications require APNs setup and enabling Push Notifications capability in Xcode.
- The app uses Firebase Web SDK for Auth/Firestore/Storage and RN Firebase for FCM.
