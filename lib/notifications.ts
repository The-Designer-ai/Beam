import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const PUSH_TOKEN_KEY = '@beam/push_token';

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

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Notifications] Skipping simulator push registration');
    return null;
  }

  let { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  const projectId = Constants.easConfig?.projectId
    ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) throw new Error('The EAS project ID is missing from this build.');

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenData.data;
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });
  }

  return token;
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function arePushNotificationsEnabled(): Promise<boolean> {
  const [{ status }, token] = await Promise.all([
    Notifications.getPermissionsAsync(),
    getStoredPushToken(),
  ]);
  return status === 'granted' && token !== null;
}

export function setupNotificationTapHandler() {
  Notifications.getLastNotificationResponseAsync().then((response) => {
    handleNotificationResponse(response);
  });

  return Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationResponse(response);
  });
}

function handleNotificationResponse(response: Notifications.NotificationResponse | null) {
  if (!response) return;

  const data = response.notification.request.content.data;
  if (data?.type === 'cast_request' || data?.type === 'cast_started') {
    router.push('/(tabs)/watch');
  } else if (data?.type === 'domain_invite') {
    router.push('/(tabs)/settings');
  }
}

export async function sendCastRequestNotification(
  sessionId: string,
  receiverDeviceId: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-cast-notification', {
    body: { sessionId, receiverDeviceId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function unregisterPushNotifications(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}
