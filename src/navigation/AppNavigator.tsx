import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LoginScreen from '../screens/LoginScreen';
import UsersListScreen from '../screens/UsersListScreen';
import ChatScreen from '../screens/ChatScreen'; // Will create this next
import * as SplashScreen from 'expo-splash-screen';
import { navigationRef } from './navigationRef';

const Stack = createStackNavigator();

const AppNavigator = () => {
    const { isAuthenticated, hasHydrated } = useSelector((state: RootState) => state.auth);

    // Hide splash once hydration finishes
    useEffect(() => {
        if (hasHydrated) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [hasHydrated]);

    if (!hasHydrated) {
        return null; // Keep native splash visible
    }

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#121212' } }}>
                {isAuthenticated ? (
                    <>
                        <Stack.Screen name="UsersList" component={UsersListScreen} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

// Temporary placeholder for ChatScreen until created
const PlaceholderChat = () => <></>;
// Note: You must create ChatScreen.tsx before this runs without error, or import placeholder.
// I will create ChatScreen.tsx immediately after this. 

export default AppNavigator;
