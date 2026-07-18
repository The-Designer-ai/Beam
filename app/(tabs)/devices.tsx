import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, ActivityIndicator, Share } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { DeviceCard } from '../../components/DeviceCard';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing } from '../../lib/theme';
import { Device } from '../../types';
import {
  createCurrentDeviceInvite,
  listSavedDevices,
  redeemDeviceInvite,
  registerCurrentDevice,
} from '../../lib/beam';

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [adding, setAdding] = useState(false);
  const onlineCount = devices.filter((d) => d.online).length;

  const loadDevices = useCallback(async () => {
    setRefreshing(true);
    try {
      await registerCurrentDevice();
      setDevices(await listSavedDevices());
    } catch (error: any) {
      Alert.alert('Devices Error', error.message || 'Could not load devices.');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  function handleCast(device: Device) {
    if (!device.online) {
      Alert.alert('Offline', `${device.name} isn't online right now.`);
      return;
    }
    router.push({ pathname: '/(tabs)/cast', params: { deviceId: device.id } });
  }

  async function handleShareDevice() {
    setSharing(true);
    try {
      const invite = await createCurrentDeviceInvite();
      await Share.share({
        message: `Add ${invite.device.name} to Beam with code ${invite.code}. This code expires in 15 minutes.`,
      });
    } catch (error: any) {
      Alert.alert('Invite Error', error.message || 'Could not create an invite code.');
    } finally {
      setSharing(false);
    }
  }

  function handleAddWithCode() {
    Alert.prompt(
      'Add a Beam Device',
      'Enter the 8-character code shared by the device owner.',
      async (code) => {
        if (!code?.trim()) return;
        setAdding(true);
        try {
          const device = await redeemDeviceInvite(code);
          await loadDevices();
          Alert.alert('Device Added', `${device.name} is now available for casting.`);
        } catch (error: any) {
          Alert.alert('Could Not Add Device', error.message || 'The invite code is invalid.');
        } finally {
          setAdding(false);
        }
      },
      'plain-text',
    );
  }

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
            <DeviceCard device={item} onPress={item.online ? () => handleCast(item) : () => handleCast(item)} />
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDevices} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[typography.subhead, styles.mutedText]}>Loading devices...</Text>
            </View>
          ) : (
            <Glass style={styles.empty}>
              <Text style={[typography.headline, styles.mutedText]}>No saved devices yet</Text>
              <Text style={[typography.subhead, styles.emptyCopy]}>
                Sign in on another iPhone or iPad, then approve it to make it available for casting.
              </Text>
            </Glass>
          )
        }
        ListFooterComponent={
          <View style={styles.nearbySection}>
            <Text style={[typography.title3, styles.sectionTitle]}>Add Device</Text>
            <Text style={[typography.subhead, styles.sectionCopy]}>
              Share this device with another Beam user, or enter a code they shared with you.
            </Text>

            <Glass contentStyle={styles.actionsContent}>
              <BeamButton
                title="Share This Device"
                onPress={handleShareDevice}
                loading={sharing}
                icon={<AppIcon ios="person.badge.plus" android="person_add" size={18} color={colors.textInverse} />}
                iosSystemImage="person.badge.plus"
                style={styles.fullButton}
              />
              <BeamButton
                title="Add With Code"
                onPress={handleAddWithCode}
                loading={adding}
                variant="secondary"
                icon={<AppIcon ios="number" android="pin" size={18} color={colors.primary} />}
                iosSystemImage="number"
                style={styles.fullButton}
              />
            </Glass>
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
    paddingBottom: 120,
  },
  loadingState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
  },
  empty: {
    padding: spacing.xxl,
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  mutedText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyCopy: {
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  nearbySection: {
    marginTop: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  sectionTitle: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionCopy: {
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  actionsContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  fullButton: {
    width: '100%',
  },
});
