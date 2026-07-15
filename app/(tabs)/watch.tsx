import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Platform, AppState } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, spacing, radius } from '../../lib/theme';

// ═══ PiP: RTCPIPView renders the stream and supports PiP natively ═══
// Both the big-screen view and the PiP floating window render simultaneously.
// When the user backgrounds the app, startAutomatically kicks in.
import { RTCPIPView, startIOSPIP, stopIOSPIP } from 'react-native-webrtc';

export default function WatchScreen() {
  const [roomCode, setRoomCode] = useState('');
  const [isWatching, setIsWatching] = useState(false);
  const [status, setStatus] = useState('');
  const [streamURL, setStreamURL] = useState<string | undefined>(undefined);
  const [pipActive, setPipActive] = useState(false);

  const videoRef = useRef<any>(null);

  // ─── Auto-handoff: PiP activates when app backgrounds, stops on return ───
  useEffect(() => {
    if (!isWatching) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' && videoRef.current) {
        // App went to background — PiP starts automatically via iosPIP opts,
        // but we also manually flag it so the UI button reflects state
        setPipActive(true);
      } else if (nextState === 'active') {
        // App returned to foreground
        // stopAutomatically handles this on native side, but sync our state
        setPipActive(false);
      }
    });

    return () => subscription.remove();
  }, [isWatching]);

  async function joinRoom() {
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Enter a room code');
      return;
    }

    setStatus('Joining room...');
    setIsWatching(true);

    try {
      // ═══ Replace with real room join via Supabase Realtime ═══
      // const signaling = createSignaling();
      // await signaling.connect(roomCode, 'receiver_user_id');
      await new Promise((r) => setTimeout(r, 1500));
      setStatus('Connected');
      // ═══ When ontrack fires, set streamURL: setStreamURL(stream.toURL()) ═══
    } catch (err: any) {
      Alert.alert('Error', err.message);
      setIsWatching(false);
      setStatus('');
    }
  }

  function leaveRoom() {
    setIsWatching(false);
    setRoomCode('');
    setStatus('');
    setStreamURL(undefined);
    setPipActive(false);
  }

  function togglePip() {
    if (!videoRef.current) return;
    if (pipActive) {
      stopIOSPIP(videoRef);
      setPipActive(false);
    } else {
      startIOSPIP(videoRef);
      setPipActive(true);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Watch</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Receive a cast or join a watch party
        </Text>
      </Animated.View>

      {!isWatching ? (
        <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.content}>
          <Glass style={styles.joinCard} contentStyle={styles.joinCardContent}>
            <Text style={[typography.title3, { marginBottom: spacing.md }]}>Join a Room</Text>
            <Text style={[typography.subhead, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
              Enter the 6-character code shared by the sender.
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Enter room code"
              placeholderTextColor={colors.textTertiary}
              value={roomCode}
              onChangeText={(value) => setRoomCode(value.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              returnKeyType="join"
              onSubmitEditing={joinRoom}
              accessibilityLabel="Room code"
            />

            <BeamButton
              title="Join Room"
              onPress={joinRoom}
              style={styles.joinButton}
            />
          </Glass>

          <Text style={[typography.subhead, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl }]}>
            Or wait for someone to cast to your device directly from their Cast tab.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.content}>
          <Glass style={styles.receivingCard} contentStyle={styles.receivingCardContent}>
            {/* ─── Video Stream via RTCPIPView ─────────────────────────── */}
            {streamURL ? (
              <View style={styles.videoContainer}>
                <RTCPIPView
                  ref={videoRef}
                  streamURL={streamURL}
                  objectFit="contain"
                  zOrder={0}
                  style={styles.video}
                  iosPIP={{
                    enabled: true,
                    startAutomatically: true,
                    stopAutomatically: true,
                  }}
                />
              </View>
            ) : (
              <>
                <View style={styles.receivingIcon}>
                  <Text style={{ fontSize: 48 }}>📺</Text>
                </View>
                <Text style={[typography.title2, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}>
                  {status}
                </Text>
              </>
            )}

            <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
              Room: {roomCode}
            </Text>

            {/* ─── PiP Toggle (visible when stream is active & iOS) ──── */}
            {streamURL && Platform.OS === 'ios' && (
              <BeamButton
                title={pipActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
                onPress={togglePip}
                variant="secondary"
                style={styles.pipButton}
              />
            )}

            <BeamButton
              title="Disconnect"
              onPress={leaveRoom}
              variant="secondary"
              style={styles.leaveButton}
            />
          </Glass>
        </Animated.View>
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
  },
  joinCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  joinCardContent: {
    padding: spacing.xxl,
    alignItems: 'center',
    width: '100%',
  },
  codeInput: {
    width: '100%',
    height: 56,
    fontSize: 28,
    letterSpacing: 0,
    textAlign: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '700',
  },
  joinButton: {
    width: '100%',
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
  receivingIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    marginTop: spacing.lg,
    minWidth: 160,
  },
  pipButton: {
    marginTop: spacing.md,
    minWidth: 200,
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
});
