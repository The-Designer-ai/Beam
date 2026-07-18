import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mediaDevices, MediaStream, RTCView } from 'react-native-webrtc';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { Device } from '../../types';
import { WebRTCManager } from '../../lib/webrtc';
import {
  createCastSession,
  endCastSession,
  listSavedDevices,
  listSessionRequests,
  sendSignal,
  subscribeToSessionRequests,
} from '../../lib/beam';
import { sendNotification } from '../../lib/notifications';

type CastPhase = 'selecting' | 'waiting' | 'casting';

export default function CastScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId?: string }>();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(deviceId ? [deviceId] : []);
  const [phase, setPhase] = useState<CastPhase>('selecting');
  const [status, setStatus] = useState('');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const senderDeviceIdRef = useRef<string | null>(null);
  const peerRefs = useRef<Record<string, WebRTCManager>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const offeredRequestIdsRef = useRef<Set<string>>(new Set());

  const selectedDevices = useMemo(
    () => devices.filter((device) => selectedIds.includes(device.id)),
    [devices, selectedIds],
  );

  useEffect(() => {
    loadDevices();
    return () => {
      stopCast(false);
    };
  }, []);

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
    if (!device.online || phase !== 'selecting') return;
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

    setPhase('waiting');
    setStatus('Waiting for selected devices to accept...');
    offeredRequestIdsRef.current.clear();

    try {
      const { sessionId, senderDevice, requests } = await createCastSession(selectedIds);
      sessionIdRef.current = sessionId;
      senderDeviceIdRef.current = senderDevice.id;

      selectedDevices.forEach((device) => {
        if (!device.pushToken) return;
        sendNotification(device.pushToken, 'Incoming Beam Cast', 'Someone wants to cast to this device.', {
          type: 'cast_request',
          sessionId,
        }).catch((error) => console.warn('[Notifications] Cast request push failed', error.message));
      });

      const channel = subscribeToSessionRequests(sessionId, () => {
        handleAcceptedRequests();
      });

      setTimeout(() => {
        channel.unsubscribe();
      }, 65_000);

      if (requests.length === 0) throw new Error('No cast requests were created.');
      setTimeout(() => handleAcceptedRequests(), 800);
      setTimeout(() => {
        if (phase === 'waiting' && offeredRequestIdsRef.current.size === 0) {
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
    const senderDeviceId = senderDeviceIdRef.current;
    if (!sessionId || !senderDeviceId) return;

    const requests = await listSessionRequests(sessionId);
    const accepted = requests.filter((request) => request.status === 'accepted');
    if (accepted.length === 0) return;

    if (!localStreamRef.current) {
      setStatus('Open the iOS screen picker to start casting.');
      const stream = await mediaDevices.getDisplayMedia();
      localStreamRef.current = stream;
      setLocalStreamURL(stream.toURL());
      setPhase('casting');
    }

    for (const request of accepted) {
      if (offeredRequestIdsRef.current.has(request.id)) continue;
      offeredRequestIdsRef.current.add(request.id);

      const webrtc = new WebRTCManager({
        onStream: () => undefined,
        onState: (state) => setStatus(state === 'connected' ? 'Streaming' : state),
        onError: (error) => console.warn('[WebRTC]', error.message),
        onIceCandidate: (candidate) => {
          sendSignal(sessionId, request.id, senderDeviceId, request.receiverDeviceId, {
            type: 'ice',
            candidate,
          }).catch((error) => console.warn('[Signal] ICE send failed', error.message));
        },
      });
      peerRefs.current[request.id] = webrtc;

      const offer = await webrtc.createOffer(localStreamRef.current);
      await sendSignal(sessionId, request.id, senderDeviceId, request.receiverDeviceId, {
        type: 'offer',
        sdp: offer,
      });
      setStatus(`Streaming to ${offeredRequestIdsRef.current.size} device${offeredRequestIdsRef.current.size === 1 ? '' : 's'}`);
    }
  }

  async function stopCast(updateRemote = true) {
    Object.values(peerRefs.current).forEach((peer) => peer.dispose());
    peerRefs.current = {};
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStreamURL(null);

    if (updateRemote && sessionIdRef.current) {
      await endCastSession(sessionIdRef.current).catch(() => undefined);
    }

    sessionIdRef.current = null;
    senderDeviceIdRef.current = null;
    offeredRequestIdsRef.current.clear();
    setPhase('selecting');
    setStatus('');
  }

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
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
          <Text style={[typography.headline, styles.statusText]}>{status}</Text>
          <Text style={[typography.subhead, styles.mutedText]}>
            {selectedDevices.map((device) => device.name).join(', ')}
          </Text>
          <BeamButton
            title="Stop Casting"
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
                  <Text style={[typography.headline, { color: colors.text }]}>{device.name}</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  statusCard: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  statusContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  preview: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
  },
  video: {
    flex: 1,
  },
  statusText: {
    color: colors.primary,
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.text,
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 180,
  },
  messageState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  mutedText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  selectableDevice: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.separator,
    padding: spacing.lg,
  },
  selectedDevice: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  deviceSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footer: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    bottom: 110,
  },
  fullButton: {
    width: '100%',
  },
  stopButton: {
    minWidth: 160,
  },
});
