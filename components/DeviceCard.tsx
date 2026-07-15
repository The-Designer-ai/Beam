import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Glass } from './Glass';
import { colors, typography, radius, spacing } from '../lib/theme';
import { Device } from '../types';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
}

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${device.name}, ${device.online ? 'online' : 'offline'}`}
      accessibilityHint={onPress ? 'Selects this device for casting' : undefined}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Glass style={[styles.card, !device.online && styles.offlineCard]}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <View style={[styles.dot, { backgroundColor: device.online ? colors.online : colors.offline }]} />
            <Text style={typography.headline} numberOfLines={1}>{device.name}</Text>
          </View>
          <Text style={[styles.badge, { color: device.online ? colors.online : colors.offline }]}>
            {device.online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Text style={typography.caption1}>
          {device.type === 'ios' ? 'iPhone/iPad' : device.type === 'android' ? 'Android' : 'Web'}
        </Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.72,
  },
  card: {
    marginBottom: 0,
  },
  offlineCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  badge: {
    ...typography.footnote,
    fontWeight: '600',
  },
});
