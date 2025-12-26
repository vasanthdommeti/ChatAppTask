import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LoginScreen from '../screens/LoginScreen';
import UsersListScreen from '../screens/UsersListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import { navigationRef } from './navigationRef';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const navTheme = {
    ...DarkTheme,
    colors: {
        ...DarkTheme.colors,
        background: '#0B141A',
    },
};

const MainTabs = () => {
    const unreadTotal = useSelector((state: RootState) => state.users.unreadTotal);
    const badge = unreadTotal > 0 ? unreadTotal : undefined;

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#202C33',
                    borderTopColor: '#1F2A30',
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

    if (!hasHydrated) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B141A' }}>
                <ActivityIndicator size="large" color="#6C63FF" />
            </View>
        );
    }

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navTheme}
        >
            <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0B141A' } }}>
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
