import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import MatchmakingScreen from '../screens/MatchmakingScreen';
import DebateRoomScreen from '../screens/DebateRoomScreen';
import FinalArgumentScreen from '../screens/FinalArgumentScreen';
import ResultsScreen from '../screens/ResultsScreen';
import SpectatorScreen from '../screens/SpectatorScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator for main app
const MainApp = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#2D2D44',
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#A0A0A0',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Leaderboard') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1E1E2C' }
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="MainApp" component={MainApp} />
        <Stack.Screen name="Matchmaking" component={MatchmakingScreen} />
        <Stack.Screen name="DebateRoom" component={DebateRoomScreen} />
        <Stack.Screen name="FinalArgument" component={FinalArgumentScreen} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="Spectator" component={SpectatorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
