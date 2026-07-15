import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../lib/theme';
import {
  configureNotificationHandler,
  registerForPushNotifications,
  setupNotificationTapHandler,
} from '../lib/notifications';

export default function RootLayout() {
  useEffect(() => {
    initializeNotifications();
  }, []);

  async function initializeNotifications() {
    // Configure how notifications show while app is in foreground
    configureNotificationHandler();

    // Register for push tokens
    registerForPushNotifications();

    // Handle notification taps (deep linking to Watch/Settings)
    const subscription = setupNotificationTapHandler();

    // Cleanup on unmount
    return () => subscription?.remove();
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="room/[code]"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              gestureEnabled: true,
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
