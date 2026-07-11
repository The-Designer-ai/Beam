import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Device, Room, SubscriptionTier } from '../types';

// ─── Keys ──────────────────────────────────────────────────────────
const KEYS = {
  USER: '@beam/user',
  DEVICES: '@beam/devices',
  ROOMS: '@beam/rooms',
  SUBSCRIPTION: '@beam/subscription',
  AUTH_TOKEN: '@beam/auth_token',
} as const;

// ─── User ──────────────────────────────────────────────────────────
export async function getStoredUser(): Promise<User | null> {
  const data = await AsyncStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export async function storeUser(user: User): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export async function clearUser(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.USER, KEYS.AUTH_TOKEN]);
}

// ─── Auth Token ────────────────────────────────────────────────────
export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function storeAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

// ─── Devices ───────────────────────────────────────────────────────
export async function getStoredDevices(): Promise<Device[]> {
  const data = await AsyncStorage.getItem(KEYS.DEVICES);
  return data ? JSON.parse(data) : [];
}

export async function storeDevices(devices: Device[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DEVICES, JSON.stringify(devices));
}

// ─── Rooms ─────────────────────────────────────────────────────────
export async function getStoredRooms(): Promise<Room[]> {
  const data = await AsyncStorage.getItem(KEYS.ROOMS);
  return data ? JSON.parse(data) : [];
}

export async function storeRooms(rooms: Room[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
}

// ─── Subscription ──────────────────────────────────────────────────
export async function getSubscription(): Promise<SubscriptionTier | null> {
  const data = await AsyncStorage.getItem(KEYS.SUBSCRIPTION);
  return data ? JSON.parse(data) : null;
}

export async function storeSubscription(sub: SubscriptionTier): Promise<void> {
  await AsyncStorage.setItem(KEYS.SUBSCRIPTION, JSON.stringify(sub));
}

// ─── Clear all ─────────────────────────────────────────────────────
export async function clearAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
