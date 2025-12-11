import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LoginScreen from '../screens/LoginScreen';
import UsersListScreen from '../screens/UsersListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import * as SplashScreen from 'expo-splash-screen';
import { navigationRef } from './navigationRef';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    const unreadTotal = useSelector((state: RootState) => state.users.unreadTotal);
    const badge = unreadTotal > 0 ? unreadTotal : undefined;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#121212',
                    borderTopColor: '#1F1F1F',
                },
                tabBarActiveTintColor: '#6C63FF',
                tabBarInactiveTintColor: '#888',
                tabBarIcon: ({ color, size }) => {
                    const icon = route.name === 'Chats' ? 'chatbubble-ellipses-outline' : 'person-circle-outline';
                    return <Ionicons name={icon as any} size={size} color={color} />;
                }
            })}
        >
            <Tab.Screen
                name="Chats"
                component={UsersListScreen}
                options={{
                    tabBarBadge: badge,
                    tabBarBadgeStyle: { backgroundColor: '#6C63FF', color: '#fff' },
                }}
            />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

const AppNavigator = () => {
    const { isAuthenticated, hasHydrated } = useSelector((state: RootState) => state.auth);
    const [navReady, setNavReady] = useState(false);
    const splashHidden = useRef(false);

    // Hide splash once hydration finishes
    useEffect(() => {
        if (hasHydrated && navReady && !splashHidden.current) {
            SplashScreen.hideAsync().catch(() => {});
            splashHidden.current = true;
        }
    }, [hasHydrated, navReady]);

    if (!hasHydrated) {
        return null; // Keep native splash visible
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => setNavReady(true)}
        >
            <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#121212' } }}>
                {isAuthenticated ? (
                    <>
                        <Stack.Screen name="MainTabs" component={MainTabs} />
                        <Stack.Screen name="Chat" component={ChatScreen} />
                    </>
                ) : (
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
