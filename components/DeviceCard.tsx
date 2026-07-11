import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glass } from './Glass';
import { colors, typography, radius, spacing } from '../lib/theme';
import { Device } from '../types';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
}

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  return (
    <Glass style={[styles.card, !device.online && styles.offlineCard]}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <View style={[styles.dot, { backgroundColor: device.online ? colors.online : colors.offline }]} />
          <Text style={typography.headline}>{device.name}</Text>
        </View>
        <Text style={[styles.badge, { color: device.online ? colors.online : colors.offline }]}>
          {device.online ? 'Online' : 'Offline'}
        </Text>
      </View>
      <Text style={typography.caption1}>
        {device.type === 'ios' ? 'iPhone/iPad' : device.type === 'android' ? 'Android' : 'Web'}
      </Text>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
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
