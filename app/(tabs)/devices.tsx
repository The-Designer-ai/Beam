import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { DeviceCard } from '../../components/DeviceCard';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { Device } from '../../types';
import { getStoredDevices, storeDevices } from '../../lib/store';
import {
  shareDomainViaNearby,
  scanForNearbyDomains,
  acceptNearbyDomain,
  stopNearby,
  isNearbySupported,
  NearbyPeer,
  NearbyState,
} from '../../lib/nearby';

// ═══ MOCK DATA — Replace with Supabase fetch when MCP is connected ═══
const MOCK_DEVICES: Device[] = [
  { id: '1', name: "Andy's iPhone", type: 'ios', online: true, lastSeen: Date.now() },
  { id: '2', name: "Andy's iPad", type: 'ios', online: true, lastSeen: Date.now() - 60000 },
  { id: '3', name: "Andy's MacBook", type: 'web', online: false, lastSeen: Date.now() - 3600000 },
];

// ═══ MOCK domain — Replace with real domain from user profile ═══
const MY_DOMAIN = 'andy.beam';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [refreshing, setRefreshing] = useState(false);
  const onlineCount = devices.filter((d) => d.online).length;
  const [nearbyState, setNearbyState] = useState<NearbyState>('idle');
  const [nearbyPeers, setNearbyPeers] = useState<NearbyPeer[]>([]);
  const [statusText, setStatusText] = useState('');
  const [showNearbyUI, setShowNearbyUI] = useState(false);
  const nearbyCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      nearbyCleanupRef.current?.();
      stopNearby();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // ═══ Replace with Supabase fetch ═══
    await new Promise((r) => setTimeout(r, 1000));
    setDevices(MOCK_DEVICES);
    setRefreshing(false);
  }, []);

  const handleCast = (device: Device) => {
    if (!device.online) {
      Alert.alert('Offline', `${device.name} isn't online right now.`);
      return;
    }
    router.push('/(tabs)/cast');
  };

  // ─── Share My Domain via Nearby ──────────────────────────

  async function handleShareDomain() {
    setShowNearbyUI(true);
    setNearbyPeers([]);
    setStatusText('Looking for nearby Beam devices...');

    try {
      const result = await shareDomainViaNearby('Andy', MY_DOMAIN, {
        onStateChange: (state, detail) => {
          setNearbyState(state);
          switch (state) {
            case 'broadcasting':
              setStatusText('Tapping nearby phones to Beam...');
              break;
            case 'connecting':
              setStatusText('Connecting...');
              break;
            case 'connected':
              setStatusText('Domain shared!');
              break;
            case 'error':
              setStatusText(`Error: ${detail}`);
              break;
          }
        },
        onPeerFound: (peer) => {
          setNearbyPeers((prev) => {
            if (prev.find((p) => p.displayName === peer.displayName)) return prev;
            return [...prev, peer];
          });
        },
        onPeerLost: (displayName) => {
          setNearbyPeers((prev) => prev.filter((p) => p.displayName !== displayName));
        },
        onDomainReceived: (token, from) => {
          setStatusText(`Domain "${token}" received from ${from}!`);
          // ═══ Save to device list via Supabase ═══
        },
        onSuccess: (result) => {
          if (result.method === 'invite-link') {
            setStatusText('Invite link shared via share sheet');
          }
        },
        onTimeout: () => {
          setStatusText('No nearby Beam devices found');
        },
        onError: (error) => {
          setStatusText(`Error: ${error.message}`);
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      // Auto-dismiss the UI after a moment
      setTimeout(() => {
        setShowNearbyUI(false);
        setNearbyState('idle');
        setStatusText('');
      }, 3000);
    }
  }

  // ─── Scan for Nearby Domains ─────────────────────────────

  async function handleScanNearby() {
    setShowNearbyUI(true);
    setNearbyPeers([]);
    setStatusText('Scanning for nearby devices...');

    try {
      await scanForNearbyDomains('Andy', {
        onStateChange: (state, detail) => {
          setNearbyState(state);
          switch (state) {
            case 'scanning':
              setStatusText('Hold your phone near theirs...');
              break;
            case 'connecting':
              setStatusText('Connecting...');
              break;
            case 'connected':
              setStatusText('Connected!');
              break;
            case 'error':
              setStatusText(`Error: ${detail}`);
              break;
          }
        },
        onPeerFound: (peer) => {
          setNearbyPeers((prev) => {
            if (prev.find((p) => p.displayName === peer.displayName)) return prev;
            return [...prev, peer];
          });
          setStatusText(`Found: ${peer.displayName}`);
        },
        onPeerLost: (displayName) => {
          setNearbyPeers((prev) => prev.filter((p) => p.displayName !== displayName));
        },
        onDomainReceived: (token, from) => {
          setStatusText(`Added domain "${token}" from ${from}!`);
          // ═══ Save to device list via Supabase ═══
        },
        onSuccess: () => {
          setStatusText('Domain added!');
        },
        onTimeout: () => {
          setStatusText('No nearby domains found.');
        },
        onError: (error) => {
          setStatusText(`Error: ${error.message}`);
        },
      });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  // ─── Accept a discovered peer's domain ───────────────────

  async function handleAcceptPeer(peer: NearbyPeer) {
    setStatusText(`Connecting to ${peer.displayName}...`);
    try {
      await acceptNearbyDomain(peer.displayName);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  // ─── Cancel Nearby ──────────────────────────────────────

  async function handleCancelNearby() {
    await stopNearby();
    setShowNearbyUI(false);
    setNearbyState('idle');
    setNearbyPeers([]);
    setStatusText('');
  }

  // ─── Render ──────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Devices</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {onlineCount} online · {devices.length} total
        </Text>
      </Animated.View>

      <FlatList
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(180).reduceMotion(ReduceMotion.System)}>
            <DeviceCard device={item} onPress={() => handleCast(item)} />
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Glass style={styles.empty}>
            <Text style={[typography.headline, { color: colors.textSecondary, textAlign: 'center' }]}>
              No devices yet
            </Text>
            <Text style={[typography.subhead, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs }]}>
              Install Beam on another device and sign in to add it to your domain.
            </Text>
          </Glass>
        }
        ListFooterComponent={
          <View style={styles.nearbySection}>
            {/* ─── Nearby Section Header ─────────────────────────── */}
            <Text style={[typography.title3, { color: colors.text, marginBottom: spacing.sm }]}>
              Add Device via Nearby
            </Text>
            <Text style={[typography.subhead, { color: colors.textTertiary, marginBottom: spacing.md }]}>
              {isNearbySupported()
                ? 'Tap your phone against theirs to share your domain wirelessly.'
                : 'Nearby sharing is only available on iOS.'}
            </Text>

            {!showNearbyUI ? (
              <Glass contentStyle={styles.nearbyActionsContent}>
                <View style={styles.nearbyActionSlot}>
                  <BeamButton
                    title="Share My Domain"
                    onPress={handleShareDomain}
                    icon={<AppIcon ios="square.and.arrow.up" android="share" size={18} color={colors.textInverse} />}
                    iosSystemImage="square.and.arrow.up"
                    variant="primary"
                    style={styles.nearbyButton}
                    disabled={!isNearbySupported()}
                  />
                </View>
                <View style={styles.nearbyActionSlot}>
                  <BeamButton
                    title="Scan for Nearby"
                    onPress={handleScanNearby}
                    icon={<AppIcon ios="viewfinder" android="search" size={18} color={colors.primary} />}
                    iosSystemImage="viewfinder"
                    variant="secondary"
                    style={styles.nearbyButton}
                    disabled={!isNearbySupported()}
                  />
                </View>
              </Glass>
            ) : (
              /* ─── Nearby Active UI ───────────────────────────── */
              <Glass contentStyle={styles.nearbyActive}>
                <View style={styles.nearbyStatusTitle}>
                  <AppIcon
                    ios={nearbyState === 'connected' ? 'checkmark.circle.fill' : nearbyState === 'error' ? 'exclamationmark.triangle.fill' : nearbyState === 'scanning' ? 'viewfinder' : 'antenna.radiowaves.left.and.right'}
                    android={nearbyState === 'connected' ? 'check_circle' : nearbyState === 'error' ? 'error' : nearbyState === 'scanning' ? 'search' : 'cell_tower'}
                    size={22}
                    color={nearbyState === 'error' ? colors.error : nearbyState === 'connected' ? colors.success : colors.primary}
                  />
                  <Text style={[typography.headline, styles.nearbyStatusText]}>
                    {nearbyState === 'broadcasting' && 'Broadcasting Domain'}
                    {nearbyState === 'scanning' && 'Scanning'}
                    {nearbyState === 'connecting' && 'Connecting'}
                    {nearbyState === 'connected' && 'Connected'}
                    {nearbyState === 'idle' && 'Nearby'}
                    {nearbyState === 'error' && 'Error'}
                  </Text>
                </View>

                <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.md }]}>
                  {statusText}
                </Text>

                {/* Spinner / state indicator */}
                {(nearbyState === 'broadcasting' || nearbyState === 'scanning' || nearbyState === 'connecting') && (
                  <View style={styles.progressRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[typography.caption1, styles.progressText]}>Keep the devices near each other</Text>
                  </View>
                )}

                {/* Discovered peers list (scanning mode) */}
                {nearbyPeers.length > 0 && (
                  <View style={styles.peersList}>
                    {nearbyPeers.map((peer, i) => (
                      <BeamButton
                        key={peer.displayName}
                        title={`Accept domain from ${peer.displayName}`}
                        onPress={() => handleAcceptPeer(peer)}
                        icon={<AppIcon ios="person.badge.plus" android="person_add" size={18} color={colors.textInverse} />}
                        iosSystemImage="person.badge.plus"
                        variant="primary"
                        style={styles.peerButton}
                      />
                    ))}
                  </View>
                )}

                {/* Invite link hint */}
                {nearbyState === 'idle' && nearbyPeers.length === 0 && statusText.includes('No nearby') && (
                  <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginBottom: spacing.md }]}>
                    An invite link was shared — if they don't have Beam, they can download it from the App Store.
                  </Text>
                )}

                <BeamButton
                  title="Cancel"
                  onPress={handleCancelNearby}
                  variant="secondary"
                  role="cancel"
                  style={styles.cancelButton}
                />
              </Glass>
            )}

            <View style={styles.createRoom}>
              <BeamButton
                title="Create Room"
                onPress={() => router.push('/(tabs)/cast')}
                icon={<AppIcon ios="plus" android="add" size={18} color={colors.textInverse} />}
                iosSystemImage="plus"
                style={styles.createRoomButton}
              />
            </View>
          </View>
        }
      />
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
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  empty: {
    padding: spacing.xxl,
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  // ── Nearby Section ───────────────────────────────────────
  nearbySection: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  nearbyActionsContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  nearbyActionSlot: {
    width: '100%',
    minHeight: 48,
  },
  nearbyButton: {
    width: '100%',
  },
  nearbyActive: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  nearbyStatusTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  nearbyStatusText: {
    color: colors.primary,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  progressText: {
    color: colors.textTertiary,
  },
  peersList: {
    width: '100%',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  peerButton: {
    width: '100%',
  },
  cancelButton: {
    minWidth: 120,
  },
  createRoom: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  createRoomButton: {
    width: '100%',
  },
});
