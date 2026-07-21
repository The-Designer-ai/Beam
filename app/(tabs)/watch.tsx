import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MediaStream, RTCView } from 'react-native-webrtc';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { WebRTCManager } from '../../lib/webrtc';
import {
  BeamCastRequest,
  listIncomingCastRequests,
  registerCurrentDevice,
  respondToCastRequest,
  sendSignal,
  subscribeToCastRequests,
  subscribeToSignals,
} from '../../lib/beam';

export default function WatchScreen() {
  const [requests, setRequests] = useState<BeamCastRequest[]>([]);
  const [currentRequest, setCurrentRequest] = useState<BeamCastRequest | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const webrtcRef = useRef<WebRTCManager | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const device = await registerCurrentDevice();
      setCurrentDeviceId(device.id);
      setRequests(await listIncomingCastRequests());
    } catch (error: any) {
      Alert.alert('Watch Error', error.message || 'Could not load cast requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: { unsubscribe: () => void } | null = null;

    async function setup() {
      const device = await registerCurrentDevice();
      setCurrentDeviceId(device.id);
      channel = subscribeToCastRequests(device.id, () => {
        loadRequests();
      });
      await loadRequests();
    }

    setup().catch((error) => {
      setLoading(false);
      Alert.alert('Watch Error', error.message || 'Could not start receiver.');
    });

    return () => {
      channel?.unsubscribe();
      signalChannelRef.current?.unsubscribe();
      webrtcRef.current?.dispose();
    };
  }, [loadRequests]);

  async function acceptRequest(request: BeamCastRequest) {
    if (!currentDeviceId) return;

    try {
      setCurrentRequest(request);
      setStatus('Preparing receiver...');

      const webrtc = new WebRTCManager({
        onStream: (incomingStream) => {
          setStream(incomingStream);
          setStatus('Receiving cast');
        },
        onState: (state) => setStatus(state === 'connected' ? 'Receiving cast' : state),
        onError: (error) => console.warn('[WebRTC]', error.message),
        onIceCandidate: (candidate) => {
          if (!currentDeviceId || !request.senderDeviceId) return;
          sendSignal(request.sessionId, request.id, currentDeviceId, request.senderDeviceId, {
            type: 'ice',
            candidate,
          }).catch((error) => console.warn('[Signal] ICE send failed', error.message));
        },
      });
      webrtcRef.current = webrtc;

      signalChannelRef.current?.unsubscribe();
      signalChannelRef.current = await subscribeToSignals(request.sessionId, currentDeviceId, async (msg, row) => {
        try {
          if (msg.type === 'offer') {
            const answer = await webrtc.handleOffer(msg.sdp);
            await sendSignal(request.sessionId, request.id, currentDeviceId, row.sender_device_id, {
              type: 'answer',
              sdp: answer,
            });
          } else if (msg.type === 'ice') {
            await webrtc.handleIceCandidate(msg.candidate);
          } else if (msg.type === 'leave') {
            leaveCast();
          }
        } catch (error: any) {
          Alert.alert('Receiver Error', error.message || 'Could not handle cast signal.');
        }
      });

      await respondToCastRequest(request.id, 'accepted');
      setStatus('Accepted. Waiting for sender to start screen sharing...');
    } catch (error: any) {
      signalChannelRef.current?.unsubscribe();
      signalChannelRef.current = null;
      webrtcRef.current?.dispose();
      webrtcRef.current = null;
      setCurrentRequest(null);
      setStatus('');
      Alert.alert('Receiver Error', error.message || 'Could not prepare this device for casting.');
    }
  }

  async function declineRequest(request: BeamCastRequest) {
    await respondToCastRequest(request.id, 'declined');
    setRequests((current) => current.filter((item) => item.id !== request.id));
  }

  function toggleMute() {
    const nextMuted = !muted;
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }

  function leaveCast() {
    webrtcRef.current?.dispose();
    webrtcRef.current = null;
    signalChannelRef.current?.unsubscribe();
    signalChannelRef.current = null;
    setStream(null);
    setCurrentRequest(null);
    setStatus('');
    setMuted(false);
    loadRequests();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Watch</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {currentRequest ? status : 'Accept incoming casts from saved devices'}
        </Text>
      </Animated.View>

      {currentRequest ? (
        <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.content}>
          <Glass style={styles.receivingCard} contentStyle={styles.receivingCardContent}>
            {stream ? (
              <View style={styles.videoContainer}>
                <RTCView streamURL={stream.toURL()} objectFit="contain" style={styles.video} />
              </View>
            ) : (
              <View style={styles.waitingState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[typography.headline, styles.centerText]}>{status}</Text>
              </View>
            )}

            <View style={styles.receiverActions}>
              <BeamButton
                title={muted ? 'Unmute Audio' : 'Mute Audio'}
                onPress={toggleMute}
                variant="secondary"
                disabled={!stream}
                icon={<AppIcon ios={muted ? 'speaker.wave.2' : 'speaker.slash'} android={muted ? 'volume_up' : 'volume_off'} size={18} color={colors.primary} />}
                iosSystemImage={muted ? 'speaker.wave.2' : 'speaker.slash'}
                style={styles.actionButton}
              />
              <BeamButton
                title="Disconnect"
                onPress={leaveCast}
                variant="secondary"
                role="destructive"
                icon={<AppIcon ios="xmark.circle" android="cancel" size={18} color={colors.error} />}
                iosSystemImage="xmark.circle"
                textStyle={{ color: colors.error }}
                style={styles.actionButton}
              />
            </View>
          </Glass>
        </Animated.View>
      ) : (
        <Animated.ScrollView
          entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
          contentContainerStyle={styles.list}
        >
          {loading ? (
            <View style={styles.waitingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[typography.subhead, styles.mutedText]}>Checking for cast requests...</Text>
            </View>
          ) : requests.length === 0 ? (
            <Glass contentStyle={styles.emptyContent}>
              <AppIcon ios="tv" android="tv" size={42} color={colors.primary} />
              <Text style={[typography.title2, styles.centerText]}>Ready to Watch</Text>
              <Text style={[typography.subhead, styles.mutedText]}>
                Incoming cast requests will appear here and as a push notification when Beam is backgrounded.
              </Text>
            </Glass>
          ) : requests.map((request) => (
            <Glass key={request.id} style={styles.requestCard} contentStyle={styles.requestContent}>
              <Text style={[typography.headline, { color: colors.text }]}>Incoming Cast</Text>
              <Text style={[typography.subhead, styles.mutedText]}>
                This request expires in about 1 minute if ignored.
              </Text>
              <View style={styles.requestActions}>
                <BeamButton
                  title="Decline"
                  onPress={() => declineRequest(request)}
                  variant="secondary"
                  role="cancel"
                  style={styles.actionButton}
                />
                <BeamButton
                  title="Accept"
                  onPress={() => acceptRequest(request)}
                  icon={<AppIcon ios="checkmark.circle.fill" android="check_circle" size={18} color={colors.textInverse} />}
                  iosSystemImage="checkmark.circle.fill"
                  style={styles.actionButton}
                />
              </View>
            </Glass>
          ))}
        </Animated.ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    justifyContent: 'center',
    paddingBottom: 72,
  },
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 120,
  },
  receivingCard: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  receivingCardContent: {
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
    marginBottom: spacing.md,
  },
  video: {
    flex: 1,
  },
  waitingState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  centerText: {
    color: colors.text,
    textAlign: 'center',
  },
  mutedText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  requestCard: {
    marginBottom: spacing.md,
  },
  requestContent: {
    gap: spacing.md,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  receiverActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
});
