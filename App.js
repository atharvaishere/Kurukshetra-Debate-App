import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_700Bold, Inter_900Black } from '@expo-google-fonts/inter';
import { Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  let [fontsLoaded] = useFonts({
    Inter_Regular: Inter_400Regular,
    Inter_Bold: Inter_700Bold,
    Inter_Black: Inter_900Black,
    Cinzel_Bold: Cinzel_700Bold,
  });

  if (!fontsLoaded) {
    return null; // App will show default splash screen until fonts are loaded
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}