import * as ExpoDevice from 'expo-device';
import { Platform } from 'react-native';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { getStoredPushToken } from './notifications';
import { Device, SignalMessage, User } from '../types';

export type CastRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'ended';

export interface BeamCastRequest {
  id: string;
  sessionId: string;
  senderUserId: string;
  senderDeviceId: string | null;
  receiverDeviceId: string;
  status: CastRequestStatus;
  expiresAt: string;
  createdAt: string;
}

type DbDevice = {
  id: string;
  owner_id: string;
  name: string;
  type: Device['type'];
  online: boolean;
  last_seen: string;
  push_token?: string | null;
};

function toDevice(row: DbDevice): Device {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    online: row.online,
    lastSeen: new Date(row.last_seen).getTime(),
    ownerId: row.owner_id,
    pushToken: row.push_token ?? undefined,
  };
}

function makeDomain(email: string, displayName?: string) {
  const source = displayName || email.split('@')[0] || 'user';
  return `@${source.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'user'}`;
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase.');
  await upsertProfile({
    id: data.user.id,
    email: data.user.email || email,
    displayName: data.user.user_metadata?.display_name || email.split('@')[0],
    domain: makeDomain(email, data.user.user_metadata?.display_name),
  });
  return data.user;
}

export async function signUpWithEmail(email: string, password: string, displayName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned from Supabase.');
  await upsertProfile({
    id: data.user.id,
    email: data.user.email || email,
    displayName,
    domain: makeDomain(email, displayName),
  });
  return data.user;
}

export async function signOut() {
  await markCurrentDeviceOffline();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function upsertProfile(user: User) {
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    domain: user.domain,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getCurrentProfile(): Promise<User | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,display_name,domain')
    .eq('id', sessionUser.id)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    const profile: User = {
      id: sessionUser.id,
      email: sessionUser.email || '',
      displayName: sessionUser.user_metadata?.display_name || sessionUser.email?.split('@')[0] || 'User',
      domain: makeDomain(sessionUser.email || 'user@beam.app', sessionUser.user_metadata?.display_name),
    };
    await upsertProfile(profile);
    return profile;
  }

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    domain: data.domain,
  };
}

export async function registerCurrentDevice() {
  const user = await getSessionUser();
  if (!user) throw new Error('Sign in before registering this device.');

  const pushToken = await getStoredPushToken();
  const name =
    ExpoDevice.deviceName ||
    ExpoDevice.modelName ||
    (Platform.OS === 'ios' ? 'iPhone' : 'Android Device');
  const type: Device['type'] = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  const { data: existing, error: existingError } = await supabase
    .from('devices')
    .select('id')
    .eq('owner_id', user.id)
    .eq('name', name)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    owner_id: user.id,
    name,
    type,
    push_token: pushToken,
    online: true,
    last_seen: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('devices')
      .update(payload)
      .eq('id', existing.id)
      .select('id,owner_id,name,type,online,last_seen,push_token')
      .single();
    if (error) throw error;
    return toDevice(data);
  }

  const { data, error } = await supabase
    .from('devices')
    .insert(payload)
    .select('id,owner_id,name,type,online,last_seen,push_token')
    .single();
  if (error) throw error;
  return toDevice(data);
}

export async function markCurrentDeviceOffline() {
  const profile = await getSessionUser();
  if (!profile) return;
  const name = ExpoDevice.deviceName || ExpoDevice.modelName;
  if (!name) return;
  await supabase
    .from('devices')
    .update({ online: false, updated_at: new Date().toISOString() })
    .eq('owner_id', profile.id)
    .eq('name', name);
}

export async function listSavedDevices(): Promise<Device[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const currentDeviceName = ExpoDevice.deviceName || ExpoDevice.modelName;

  const { data, error } = await supabase
    .from('devices')
    .select('id,owner_id,name,type,online,last_seen,push_token')
    .order('online', { ascending: false })
    .order('last_seen', { ascending: false });
  if (error) throw error;

  return (data || [])
    .map(toDevice)
    .filter((device) => device.name !== currentDeviceName);
}

export async function createCurrentDeviceInvite() {
  const device = await registerCurrentDevice();
  const { data, error } = await supabase.rpc('create_device_invite', {
    p_target_device_id: device.id,
  });
  if (error) throw error;

  const invite = data?.[0];
  if (!invite) throw new Error('Supabase did not return an invite code.');
  return {
    code: invite.code as string,
    expiresAt: invite.expires_at as string,
    device,
  };
}

export async function redeemDeviceInvite(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new Error('Enter an invite code.');

  const { data, error } = await supabase.rpc('redeem_device_invite', {
    p_code: normalizedCode,
  });
  if (error) throw error;

  const device = data?.[0];
  if (!device) throw new Error('Supabase did not return the shared device.');
  return {
    id: device.device_id as string,
    name: device.device_name as string,
    type: device.device_type as Device['type'],
    ownerId: device.owner_id as string,
  };
}

export async function createCastSession(receiverDeviceIds: string[]) {
  const user = await getSessionUser();
  if (!user) throw new Error('Sign in before casting.');
  const senderDevice = await registerCurrentDevice();

  const { data: session, error: sessionError } = await supabase
    .from('cast_sessions')
    .insert({
      sender_user_id: user.id,
      sender_device_id: senderDevice.id,
      status: 'pending',
    })
    .select('id')
    .single();
  if (sessionError) throw sessionError;

  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const rows = receiverDeviceIds.map((receiverDeviceId) => ({
    session_id: session.id,
    sender_user_id: user.id,
    sender_device_id: senderDevice.id,
    receiver_device_id: receiverDeviceId,
    status: 'pending',
    expires_at: expiresAt,
  }));

  const { data: requests, error: requestError } = await supabase
    .from('cast_requests')
    .insert(rows)
    .select('id,session_id,sender_user_id,sender_device_id,receiver_device_id,status,expires_at,created_at');
  if (requestError) throw requestError;

  return {
    sessionId: session.id as string,
    senderDevice,
    requests: (requests || []).map(toCastRequest),
  };
}

function toCastRequest(row: any): BeamCastRequest {
  return {
    id: row.id,
    sessionId: row.session_id,
    senderUserId: row.sender_user_id,
    senderDeviceId: row.sender_device_id,
    receiverDeviceId: row.receiver_device_id,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function listIncomingCastRequests(): Promise<BeamCastRequest[]> {
  const currentDevice = await registerCurrentDevice();
  const { data, error } = await supabase
    .from('cast_requests')
    .select('id,session_id,sender_user_id,sender_device_id,receiver_device_id,status,expires_at,created_at')
    .eq('receiver_device_id', currentDevice.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCastRequest);
}

export async function respondToCastRequest(requestId: string, status: 'accepted' | 'declined') {
  const { error } = await supabase
    .from('cast_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
}

export async function endCastSession(sessionId: string) {
  await supabase
    .from('cast_sessions')
    .update({ status: 'ended', ended_at: new Date().toISOString() })
    .eq('id', sessionId);
  await supabase
    .from('cast_requests')
    .update({ status: 'ended' })
    .eq('session_id', sessionId)
    .in('status', ['pending', 'accepted']);
}

export function subscribeToCastRequests(deviceId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`beam:cast-requests:${deviceId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cast_requests', filter: `receiver_device_id=eq.${deviceId}` },
      onChange,
    )
    .subscribe();
}

export function subscribeToSessionRequests(sessionId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`beam:session-requests:${sessionId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cast_requests', filter: `session_id=eq.${sessionId}` },
      onChange,
    )
    .subscribe();
}

export async function listSessionRequests(sessionId: string): Promise<BeamCastRequest[]> {
  const { data, error } = await supabase
    .from('cast_requests')
    .select('id,session_id,sender_user_id,sender_device_id,receiver_device_id,status,expires_at,created_at')
    .eq('session_id', sessionId);
  if (error) throw error;
  return (data || []).map(toCastRequest);
}

export async function sendSignal(
  sessionId: string,
  requestId: string,
  senderDeviceId: string,
  targetDeviceId: string,
  msg: SignalMessage,
) {
  const { error } = await supabase.from('webrtc_signals').insert({
    session_id: sessionId,
    request_id: requestId,
    sender_device_id: senderDeviceId,
    target_device_id: targetDeviceId,
    signal_type: msg.type,
    payload: msg,
  });
  if (error) throw error;
}

export function subscribeToSignals(
  sessionId: string,
  targetDeviceId: string,
  onSignal: (msg: SignalMessage, row: any) => void,
): RealtimeChannel {
  return supabase
    .channel(`beam:signals:${sessionId}:${targetDeviceId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'webrtc_signals', filter: `target_device_id=eq.${targetDeviceId}` },
      (payload) => {
        const row = payload.new as any;
        if (row.session_id === sessionId) onSignal(row.payload as SignalMessage, row);
      },
    )
    .subscribe();
}
