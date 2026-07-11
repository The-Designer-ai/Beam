import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { DeviceCard } from '../../components/DeviceCard';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, spacing } from '../../lib/theme';
import { Device } from '../../types';
import { getStoredDevices, storeDevices } from '../../lib/store';

// ═══ MOCK DATA — Replace with Supabase fetch when MCP is connected ═══
const MOCK_DEVICES: Device[] = [
  { id: '1', name: "Andy's iPhone", type: 'ios', online: true, lastSeen: Date.now() },
  { id: '2', name: "Andy's iPad", type: 'ios', online: true, lastSeen: Date.now() - 60000 },
  { id: '3', name: "Andy's MacBook", type: 'web', online: false, lastSeen: Date.now() - 3600000 },
];

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>(MOCK_DEVICES);
  const [refreshing, setRefreshing] = useState(false);
  const onlineCount = devices.filter((d) => d.online).length;

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
    // Navigate to cast screen with device preselected
    router.push('/(tabs)/cast');
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Devices</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          {onlineCount} online · {devices.length} total
        </Text>
      </Animated.View>

      <FlatList
        data={devices}
        keyExtractor={(d) => d.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
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
      />

      <Glass style={styles.fab}>
        <BeamButton
          title="Create Room"
          onPress={() => router.push('/(tabs)/cast')}
          style={styles.fabButton}
        />
      </Glass>
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
  list: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 120,
  },
  empty: {
    padding: spacing.xxl,
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    left: spacing.xxl,
    right: spacing.xxl,
    padding: 4,
    borderRadius: 16,
  },
  fabButton: {
    width: '100%',
  },
});
