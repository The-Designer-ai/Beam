import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { DeviceCard } from '../../components/DeviceCard';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing } from '../../lib/theme';
import { Device, SignalingProvider, SignalMessage } from '../../types';
import { WebRTCManager } from '../../lib/webrtc';
import { createSignaling } from '../../lib/signaling';
import { getStoredDevices } from '../../lib/store';
import { getStoredPushToken, sendNotification } from '../../lib/notifications';

const MOCK_DEVICES: Device[] = [
  { id: '1', name: "Andy's iPhone", type: 'ios', online: true, lastSeen: Date.now() },
  { id: '2', name: "Andy's iPad", type: 'ios', online: true, lastSeen: Date.now() - 60000 },
  { id: '3', name: "Andy's MacBook", type: 'web', online: false, lastSeen: Date.now() - 3600000 },
];

export default function CastScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isCasting, setIsCasting] = useState(false);
  const [targetDevice, setTargetDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [startingDeviceId, setStartingDeviceId] = useState<string | null>(null);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const castSessionRef = useRef(0);

  useEffect(() => {
    loadDevices();
    return () => {
      castSessionRef.current += 1;
      webrtcRef.current?.dispose();
      webrtcRef.current = null;
    };
  }, []);

  async function loadDevices() {
    setLoadingDevices(true);
    setLoadError('');
    try {
      const stored = await getStoredDevices();
      setDevices(stored.length > 0 ? stored : MOCK_DEVICES);
    } catch {
      setLoadError('Could not load your devices.');
    } finally {
      setLoadingDevices(false);
    }
  }

  async function startScreenCast(device: Device) {
    if (startingDeviceId) return;

    const sessionId = castSessionRef.current + 1;
    castSessionRef.current = sessionId;
    webrtcRef.current?.dispose();
    webrtcRef.current = null;

    setStartingDeviceId(device.id);
    setTargetDevice(device);
    setStatus('Connecting...');
    setIsCasting(true);

    // Send push notification to the target device
    // ═══ Replace with Supabase-powered push when MCP connected ═══
    getStoredPushToken().then((token) => {
      if (token) {
        sendNotification(
          token,
          'Beam Cast',
          `${device.name} is casting to you`,
          { type: 'cast_started', from: device.name }
        );
      }
    });

    try {
      const webrtc = new WebRTCManager({
        onStream: (stream) => {
          setStatus('Streaming live');
        },
        onState: (state) => {
          if (castSessionRef.current !== sessionId) return;
          setStatus(state === 'connected' ? 'Streaming' : state);
          if (state === 'failed' || state === 'disconnected') {
            setIsCasting(false);
            setTargetDevice(null);
          }
        },
        onError: (err) => {
          if (castSessionRef.current !== sessionId) return;
          console.warn('WebRTC:', err.message);
        },
      });
      webrtcRef.current = webrtc;

      const offer = await webrtc.createOffer();
      if (castSessionRef.current !== sessionId) {
        webrtc.dispose();
        return;
      }

      // ═══ SIGNALING — Replace with Supabase Realtime when MCP connected ═══
      // const signaling = createSignaling();
      // await signaling.connect('room_' + device.id, 'current_user_id');
      // signaling.send({ type: 'offer', sdp: offer });

      setStatus('Offer created — waiting for receiver');

      // For dev testing without a signaling server, show the offer
      console.log('[Beam] Offer created. Signaling server needed to complete connection.');
    } catch (err: any) {
      if (castSessionRef.current !== sessionId) return;
      webrtcRef.current?.dispose();
      webrtcRef.current = null;
      Alert.alert('Cast Failed', err.message);
      setIsCasting(false);
      setTargetDevice(null);
      setStatus('');
    } finally {
      if (castSessionRef.current === sessionId) {
        setStartingDeviceId(null);
      }
    }
  }

  function stopCast() {
    castSessionRef.current += 1;
    webrtcRef.current?.dispose();
    webrtcRef.current = null;
    setIsCasting(false);
    setTargetDevice(null);
    setStatus('');
    setStartingDeviceId(null);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Cast</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {isCasting ? `Streaming to ${targetDevice?.name}` : 'Beam your screen to another device'}
        </Text>
      </Animated.View>

      {/* Current cast status */}
      {isCasting && (
        <Animated.View entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)}>
          <Glass style={styles.castingBanner}>
            <View style={styles.castingRow}>
              <AppIcon ios="dot.radiowaves.left.and.right" android="cast" size={20} color={colors.success} />
              <Text style={[typography.headline, { color: colors.primary }]}>{status}</Text>
            </View>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              To {targetDevice?.name}
            </Text>
            <BeamButton
              title="Stop Casting"
              onPress={stopCast}
              variant="secondary"
              icon={<AppIcon ios="stop.fill" android="stop" size={17} color={colors.error} />}
              iosSystemImage="stop.fill"
              role="destructive"
              style={styles.stopButton}
            />
          </Glass>
        </Animated.View>
      )}

      {/* Available devices */}
      <Text style={[typography.title2, { color: colors.text, paddingHorizontal: spacing.xxl, marginBottom: spacing.md }]}>
        Available Devices
      </Text>

      <Animated.ScrollView
        contentContainerStyle={styles.list}
        entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      >
        {loadingDevices ? (
          <View style={styles.messageState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[typography.subhead, styles.messageText]}>Loading devices...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.messageState}>
            <Text style={[typography.body, styles.messageText]}>{loadError}</Text>
            <BeamButton
              title="Try Again"
              onPress={loadDevices}
              variant="secondary"
              size="sm"
              icon={<AppIcon ios="arrow.clockwise" android="refresh" size={17} color={colors.primary} />}
              iosSystemImage="arrow.clockwise"
            />
          </View>
        ) : devices.filter((device) => device.online).length === 0 ? (
          <Glass contentStyle={styles.emptyContent}>
            <AppIcon ios="iphone.slash" android="phonelink_off" size={34} color={colors.textTertiary} />
            <Text style={[typography.headline, styles.messageText]}>No online devices</Text>
            <Text style={[typography.subhead, styles.messageText]}>Open Beam on another device, then return here.</Text>
          </Glass>
        ) : devices
          .filter((d) => d.online)
          .map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onPress={startingDeviceId ? undefined : () => startScreenCast(device)}
            />
          ))}
      </Animated.ScrollView>
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
  castingBanner: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  castingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  stopButton: {
    marginTop: spacing.md,
    minWidth: 160,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 120,
  },
  messageState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  messageText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
});
