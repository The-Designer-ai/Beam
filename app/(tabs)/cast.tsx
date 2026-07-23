import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mediaDevices, MediaStream, RTCView } from 'react-native-webrtc';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { Device } from '../../types';
import { WebRTCManager } from '../../lib/webrtc';
import {
  BeamCastRequest,
  createCastSession,
  endCastSession,
  listSavedDevices,
  listSessionRequests,
  recordCastDiagnostic,
  sendSignal,
  subscribeToSignals,
  subscribeToSessionRequests,
} from '../../lib/beam';
import { sendCastRequestNotification } from '../../lib/notifications';
import { getDeviceDisplayName } from '../../lib/deviceName';
import { openIOSScreenBroadcastPicker } from '../../lib/screenBroadcast';

type CastPhase = 'selecting' | 'waiting' | 'ready' | 'starting' | 'connecting' | 'connected' | 'failed';

export default function CastScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(deviceId ? [deviceId] : []);
  const [phase, setPhase] = useState<CastPhase>('selecting');
  const [status, setStatus] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const phaseRef = useRef<CastPhase>('selecting');
  const sessionIdRef = useRef<string | null>(null);
  const senderDeviceIdRef = useRef<string | null>(null);
  const peerRefs = useRef<Record<string, WebRTCManager>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const acceptedRequestsRef = useRef<BeamCastRequest[]>([]);
  const offeredRequestIdsRef = useRef<Set<string>>(new Set());
  const connectedRequestIdsRef = useRef<Set<string>>(new Set());
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const requestChannelRef = useRef<RealtimeChannel | null>(null);
  const requestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedIds.includes(device.id)),
    [devices, selectedIds],
  );

  function updatePhase(nextPhase: CastPhase, nextStatus: string) {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
    setStatus(nextStatus);
  }

  useEffect(() => {
    loadDevices();
    return () => {
      stopCast(false);
    };
  }, []);

  useEffect(() => {
    if (deviceId && phaseRef.current === 'selecting') {
      setSelectedIds([deviceId]);
    }
  }, [deviceId]);

  async function loadDevices() {
    setLoadingDevices(true);
    try {
      const loaded = await listSavedDevices();
      setDevices(loaded);
      if (deviceId) setSelectedIds([deviceId]);
    } catch (error: any) {
      Alert.alert('Devices Error', error.message || 'Could not load devices.');
    } finally {
      setLoadingDevices(false);
    }
  }

  function toggleDevice(device: Device) {
    if (!device.online || phaseRef.current !== 'selecting') return;
    setSelectedIds((current) =>
      current.includes(device.id)
        ? current.filter((id) => id !== device.id)
        : [...current, device.id],
    );
  }

  async function startRequest() {
    if (selectedIds.length === 0) {
      Alert.alert('Select Devices', 'Choose at least one online device to cast to.');
      return;
    }

    updatePhase('waiting', 'Waiting for selected devices to accept...');
    acceptedRequestsRef.current = [];
    offeredRequestIdsRef.current.clear();
    connectedRequestIdsRef.current.clear();

    try {
      const { sessionId, senderDevice, requests } = await createCastSession(selectedIds);
      sessionIdRef.current = sessionId;
      senderDeviceIdRef.current = senderDevice.id;
      void recordCastDiagnostic(sessionId, null, senderDevice.id, 'sender', 'request_created', {
        receiverCount: requests.length,
      });

      signalChannelRef.current = await subscribeToSignals(
        sessionId,
        senderDevice.id,
        async (msg, row) => {
          const requestId = row.request_id as string;
          const peer = peerRefs.current[requestId];
          if (!peer) return;

          try {
            if (msg.type === 'answer') {
              await peer.handleAnswer(msg.sdp);
              void recordCastDiagnostic(sessionId, requestId, senderDevice.id, 'sender', 'answer_received');
            } else if (msg.type === 'ice') {
              await peer.handleIceCandidate(msg.candidate);
            }
          } catch (error: any) {
            console.warn('[Signal] Sender could not handle signal', error.message);
            updatePhase('failed', 'Connection failed');
            void recordCastDiagnostic(sessionId, requestId, senderDevice.id, 'sender', 'signal_failed', {
              message: error.message,
            });
          }
        },
      );

      requests.forEach((request) => {
        sendCastRequestNotification(sessionId, request.receiverDeviceId).catch((error) => {
          console.warn('[Notifications] Cast request push failed', error.message);
        });
      });

      requestChannelRef.current = subscribeToSessionRequests(sessionId, () => {
        handleAcceptedRequests();
      });

      if (requests.length === 0) throw new Error('No cast requests were created.');
      setTimeout(() => handleAcceptedRequests(), 800);
      requestTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current === 'waiting' && acceptedRequestsRef.current.length === 0) {
          Alert.alert('No Response', 'No devices accepted before the request expired.');
          stopCast();
        }
      }, 60_000);
    } catch (error: any) {
      Alert.alert('Cast Failed', error.message || 'Could not start cast request.');
      await stopCast();
    }
  }

  async function handleAcceptedRequests() {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    try {
      const requests = await listSessionRequests(sessionId);
      const accepted = requests.filter((request) => request.status === 'accepted');
      if (accepted.length === 0) return;

      acceptedRequestsRef.current = accepted;
      if (!localStreamRef.current) {
        updatePhase('ready', `${accepted.length} device${accepted.length === 1 ? '' : 's'} accepted`);
        return;
      }
      await connectAcceptedRequests(accepted);
    } catch (error: any) {
      console.warn('[Cast] Could not refresh accepted requests', error.message);
    }
  }

  async function startScreenBroadcast() {
    const sessionId = sessionIdRef.current;
    const senderDeviceId = senderDeviceIdRef.current;
    if (!sessionId || !senderDeviceId || acceptedRequestsRef.current.length === 0) return;

    updatePhase('starting', 'Choose Beam, then tap Start Broadcast');
    void recordCastDiagnostic(sessionId, null, senderDeviceId, 'sender', 'picker_requested');

    try {
      await openIOSScreenBroadcastPicker();
      void recordCastDiagnostic(sessionId, null, senderDeviceId, 'sender', 'broadcast_started');
      const stream = await mediaDevices.getDisplayMedia();
      localStreamRef.current = stream;
      setLocalStreamURL(stream.toURL());
      await connectAcceptedRequests(acceptedRequestsRef.current);
    } catch (error: any) {
      updatePhase('ready', 'Ready to start screen broadcast');
      void recordCastDiagnostic(sessionId, null, senderDeviceId, 'sender', 'picker_failed', {
        message: error.message,
      });
      Alert.alert('Screen Broadcast', error.message || 'Could not start the iOS screen broadcast.');
    }
  }

  async function connectAcceptedRequests(requests: BeamCastRequest[]) {
    const sessionId = sessionIdRef.current;
    const senderDeviceId = senderDeviceIdRef.current;
    const stream = localStreamRef.current;
    if (!sessionId || !senderDeviceId || !stream) return;

    updatePhase('connecting', 'Connecting...');
    for (const request of requests) {
      if (offeredRequestIdsRef.current.has(request.id)) continue;
      offeredRequestIdsRef.current.add(request.id);

      const webrtc = new WebRTCManager({
        onStream: () => undefined,
        onState: (state) => {
          void recordCastDiagnostic(sessionId, request.id, senderDeviceId, 'sender', `connection_${state}`);
          if (state === 'connected') {
            connectedRequestIdsRef.current.add(request.id);
            const count = connectedRequestIdsRef.current.size;
            updatePhase('connected', `Streaming to ${count} device${count === 1 ? '' : 's'}`);
          } else if (state === 'failed' || state === 'disconnected') {
            connectedRequestIdsRef.current.delete(request.id);
            updatePhase('failed', 'Connection failed');
          } else if (phaseRef.current !== 'connected') {
            updatePhase('connecting', 'Connecting...');
          }
        },
        onError: (error) => {
          console.warn('[WebRTC]', error.message);
          void recordCastDiagnostic(sessionId, request.id, senderDeviceId, 'sender', 'webrtc_error', {
            message: error.message,
          });
        },
        onRoute: (route) => {
          void recordCastDiagnostic(sessionId, request.id, senderDeviceId, 'sender', 'network_route', { route });
        },
        onIceCandidate: (candidate) => {
          sendSignal(sessionId, request.id, senderDeviceId, request.receiverDeviceId, {
            type: 'ice',
            candidate,
          }).catch((error) => console.warn('[Signal] ICE send failed', error.message));
        },
      });
      peerRefs.current[request.id] = webrtc;

      try {
        const offer = await webrtc.createOffer(stream);
        await sendSignal(sessionId, request.id, senderDeviceId, request.receiverDeviceId, {
          type: 'offer',
          sdp: offer,
        });
        void recordCastDiagnostic(sessionId, request.id, senderDeviceId, 'sender', 'offer_sent');
      } catch (error: any) {
        offeredRequestIdsRef.current.delete(request.id);
        updatePhase('failed', 'Connection failed');
        void recordCastDiagnostic(sessionId, request.id, senderDeviceId, 'sender', 'offer_failed', {
          message: error.message,
        });
      }
    }
  }

  async function retryConnections() {
    Object.values(peerRefs.current).forEach((peer) => peer.dispose());
    peerRefs.current = {};
    offeredRequestIdsRef.current.clear();
    connectedRequestIdsRef.current.clear();
    await connectAcceptedRequests(acceptedRequestsRef.current);
  }

  async function stopCast(updateRemote = true) {
    if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current);
    requestTimeoutRef.current = null;
    requestChannelRef.current?.unsubscribe();
    requestChannelRef.current = null;
    Object.values(peerRefs.current).forEach((peer) => peer.dispose());
    peerRefs.current = {};
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStreamURL(null);
    signalChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;

    if (updateRemote && sessionIdRef.current) {
      await endCastSession(sessionIdRef.current).catch(() => undefined);
    }

    sessionIdRef.current = null;
    senderDeviceIdRef.current = null;
    acceptedRequestsRef.current = [];
    offeredRequestIdsRef.current.clear();
    connectedRequestIdsRef.current.clear();
    updatePhase('selecting', '');
  }

  const selectedNames = selectedDevices.map(getDeviceDisplayName).join(', ');
  const canStartBroadcast = phase === 'ready' || (phase === 'failed' && !localStreamURL);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Cast</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {phase === 'selecting' ? 'Select devices to receive your screen' : status}
        </Text>
      </Animated.View>

      {phase !== 'selecting' && (
        <Glass style={styles.statusCard} contentStyle={styles.statusContent}>
          {localStreamURL ? (
            <View style={styles.preview}>
              <RTCView streamURL={localStreamURL} objectFit="contain" style={styles.video} />
            </View>
          ) : phase === 'waiting' || phase === 'starting' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <AppIcon ios="rectangle.on.rectangle" android="screen_share" size={38} color={colors.primary} />
          )}
          <Text style={[typography.headline, styles.statusText]}>{status}</Text>
          <Text style={[typography.subhead, styles.mutedText]}>{selectedNames}</Text>
          {canStartBroadcast && (
            <BeamButton
              title="Start Screen Broadcast"
              onPress={startScreenBroadcast}
              icon={<AppIcon ios="record.circle" android="screen_share" size={18} color={colors.textInverse} />}
              iosSystemImage="record.circle"
              style={styles.primaryAction}
            />
          )}
          {phase === 'failed' && localStreamURL && (
            <BeamButton
              title="Retry Connection"
              onPress={retryConnections}
              icon={<AppIcon ios="arrow.clockwise" android="refresh" size={18} color={colors.textInverse} />}
              iosSystemImage="arrow.clockwise"
              style={styles.primaryAction}
            />
          )}
          <BeamButton
            title="Cancel Casting"
            onPress={() => stopCast()}
            variant="secondary"
            role="destructive"
            icon={<AppIcon ios="stop.fill" android="stop" size={17} color={colors.error} />}
            iosSystemImage="stop.fill"
            textStyle={{ color: colors.error }}
            style={styles.stopButton}
          />
        </Glass>
      )}

      <Text style={[typography.title2, styles.sectionTitle]}>Online Devices</Text>

      <Animated.ScrollView
        contentContainerStyle={styles.list}
        entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      >
        {loadingDevices ? (
          <View style={styles.messageState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.subhead, styles.mutedText]}>Loading devices...</Text>
          </View>
        ) : devices.filter((device) => device.online).length === 0 ? (
          <Glass contentStyle={styles.emptyContent}>
            <AppIcon ios="iphone.slash" android="phonelink_off" size={34} color={colors.textTertiary} />
            <Text style={[typography.headline, styles.mutedText]}>No online devices</Text>
            <Text style={[typography.subhead, styles.mutedText]}>Open Beam on another saved device.</Text>
          </Glass>
        ) : devices.filter((device) => device.online).map((device) => {
          const selected = selectedIds.includes(device.id);
          return (
            <Pressable
              key={device.id}
              onPress={() => toggleDevice(device)}
              disabled={phase !== 'selecting'}
              style={[styles.selectableDevice, selected && styles.selectedDevice]}
            >
              <View style={styles.deviceSelectRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.headline, { color: colors.text }]}>{getDeviceDisplayName(device)}</Text>
                  <Text style={[typography.caption1, { color: colors.textSecondary }]}>Online</Text>
                </View>
                <AppIcon
                  ios={selected ? 'checkmark.circle.fill' : 'circle'}
                  android={selected ? 'check_circle' : 'radio_button_unchecked'}
                  size={24}
                  color={selected ? colors.primary : colors.textTertiary}
                />
              </View>
            </Pressable>
          );
        })}
      </Animated.ScrollView>

      {phase === 'selecting' && (
        <View style={styles.footer}>
          <BeamButton
            title={`Send Cast Request${selectedIds.length ? ` (${selectedIds.length})` : ''}`}
            onPress={startRequest}
            disabled={selectedIds.length === 0}
            icon={<AppIcon ios="airplayvideo" android="cast" size={18} color={colors.textInverse} />}
            iosSystemImage="airplayvideo"
            style={styles.fullButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: spacing.md, paddingHorizontal: spacing.xxl, paddingBottom: spacing.lg },
  statusCard: { marginHorizontal: spacing.xxl, marginBottom: spacing.xl },
  statusContent: { alignItems: 'center', gap: spacing.md },
  preview: {
    width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg,
    overflow: 'hidden', backgroundColor: colors.bgSecondary,
  },
  video: { flex: 1 },
  statusText: { color: colors.primary, textAlign: 'center' },
  sectionTitle: { color: colors.text, paddingHorizontal: spacing.xxl, marginBottom: spacing.md },
  list: { paddingHorizontal: spacing.xxl, paddingBottom: 180 },
  messageState: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  mutedText: { color: colors.textSecondary, textAlign: 'center' },
  emptyContent: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
  selectableDevice: {
    marginBottom: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.glassBg,
    borderWidth: 1, borderColor: colors.separator, padding: spacing.lg,
  },
  selectedDevice: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  deviceSelectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footer: { position: 'absolute', left: spacing.xxl, right: spacing.xxl, bottom: 110 },
  fullButton: { width: '100%' },
  primaryAction: { minWidth: 220 },
  stopButton: { minWidth: 170 },
});
