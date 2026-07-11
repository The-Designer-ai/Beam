import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const PUSH_TOKEN_KEY = '@beam/push_token';

// ─── Configure how notifications appear ───────────────────────────
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Register for push notifications ──────────────────────────────
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    // Running on simulator — Expo push tokens don't work on simulators
    console.log('[Notifications] Skipping — simulator');
    return null;
  }

  // Check existing permission
  let { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If not granted, ask
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  // Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: undefined, // Uses the project from app.json
  });
  const token = tokenData.data;

  // Cache it locally
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  // Android-specific channel (no-op on iOS but safe)
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  console.log(`[Notifications] Registered: ${token}`);
  return token;
}

// ─── Get stored push token ────────────────────────────────────────
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

// ─── Handle notification taps (app opened from notification) ──────
export function setupNotificationTapHandler() {
  // App was opened via notification (cold start)
  Notifications.getLastNotificationResponseAsync().then((response) => {
    handleNotificationResponse(response);
  });

  // App was in foreground when notification tapped (warm start)
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleNotificationResponse(response);
    }
  );

  return subscription;
}

function handleNotificationResponse(
  response: Notifications.NotificationResponse | null
) {
  if (!response) return;

  const data = response.notification.request.content.data;

  // ═══ Replace with Supabase-powered deep linking when MCP connected ═══
  if (data?.type === 'cast_started') {
    router.push('/(tabs)/watch');
  } else if (data?.type === 'domain_invite') {
    router.push('/(tabs)/settings');
  }
}

// ─── Send a push notification (via Expo Push API) ─────────────────
// ═══ Replace with Supabase Edge Functions + DB when MCP connected ═══
// For now, this is a placeholder that logs what would be sent.
export async function sendNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  const message = {
    to: pushToken,
    sound: 'default' as const,
    title,
    body,
    data: data || {},
    _displayInForeground: true,
  };

  console.log('[Notifications] Would send:', JSON.stringify(message, null, 2));

  // ═══ Actual implementation when Supabase is connected ═══
  // const { error } = await supabase.functions.invoke('send-push', {
  //   body: { pushToken, title, body, data }
  // });
  // if (error) console.error('[Notifications] Send failed:', error);
}

// ─── Cleanup ──────────────────────────────────────────────────────
export async function unregisterPushNotifications(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  // ═══ Also remove from Supabase device registry when MCP connected ═══
}
