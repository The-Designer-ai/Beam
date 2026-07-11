import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { DeviceCard } from '../../components/DeviceCard';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, spacing } from '../../lib/theme';
import { Device, SignalingProvider, SignalMessage } from '../../types';
import { WebRTCManager } from '../../lib/webrtc';
import { createSignaling } from '../../lib/signaling';
import { getStoredDevices } from '../../lib/store';
import { getStoredPushToken, sendNotification } from '../../lib/notifications';

export default function CastScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isCasting, setIsCasting] = useState(false);
  const [targetDevice, setTargetDevice] = useState<Device | null>(null);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    const stored = await getStoredDevices();
    if (stored.length > 0) {
      setDevices(stored);
    } else {
      // Default mock devices
      setDevices([
        { id: '1', name: "Andy's iPhone", type: 'ios', online: true, lastSeen: Date.now() },
        { id: '2', name: "Andy's iPad", type: 'ios', online: true, lastSeen: Date.now() - 60000 },
        { id: '3', name: "Andy's MacBook", type: 'web', online: false, lastSeen: Date.now() - 3600000 },
      ]);
    }
  }

  async function startScreenCast(device: Device) {
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
          setStatus(state === 'connected' ? 'Streaming' : state);
          if (state === 'failed' || state === 'disconnected') {
            setIsCasting(false);
            setTargetDevice(null);
          }
        },
        onError: (err) => {
          console.warn('WebRTC:', err.message);
        },
      });

      const offer = await webrtc.createOffer();

      // ═══ SIGNALING — Replace with Supabase Realtime when MCP connected ═══
      // const signaling = createSignaling();
      // await signaling.connect('room_' + device.id, 'current_user_id');
      // signaling.send({ type: 'offer', sdp: offer });

      setStatus('Offer created — waiting for receiver');

      // For dev testing without a signaling server, show the offer
      console.log('[Beam] Offer created. Signaling server needed to complete connection.');
    } catch (err: any) {
      Alert.alert('Cast Failed', err.message);
      setIsCasting(false);
      setTargetDevice(null);
      setStatus('');
    }
  }

  function stopCast() {
    setIsCasting(false);
    setTargetDevice(null);
    setStatus('');
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Cast</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {isCasting ? `Streaming to ${targetDevice?.name}` : 'Beam your screen to another device'}
        </Text>
      </Animated.View>

      {/* Current cast status */}
      {isCasting && (
        <Animated.View entering={FadeInDown.springify()}>
          <Glass style={styles.castingBanner}>
            <View style={styles.castingRow}>
              <View style={styles.castingDot} />
              <Text style={[typography.headline, { color: colors.primary }]}>{status}</Text>
            </View>
            <Text style={[typography.caption1, { color: colors.textSecondary }]}>
              To {targetDevice?.name}
            </Text>
            <BeamButton
              title="Stop Casting"
              onPress={stopCast}
              variant="secondary"
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
        entering={FadeInDown.delay(100).springify()}
      >
        {devices
          .filter((d) => d.online)
          .map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onPress={() => startScreenCast(device)}
            />
          ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: 60,
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
  castingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
  },
  stopButton: {
    marginTop: spacing.md,
    minWidth: 160,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 120,
  },
});
