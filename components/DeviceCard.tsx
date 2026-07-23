import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Glass } from './Glass';
import { AppIcon } from './AppIcon';
import { colors, typography, radius, spacing } from '../lib/theme';
import { Device } from '../types';
import { getDeviceDisplayName } from '../lib/deviceName';

interface DeviceCardProps {
  device: Device;
  onPress?: () => void;
}

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  const typeLabel = device.type === 'ios' ? 'iPhone/iPad' : device.type === 'android' ? 'Android' : 'Web';
  const displayName = getDeviceDisplayName(device);
  const detail = device.ownerDomain ? `${device.ownerDomain} - ${typeLabel}` : typeLabel;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${displayName}, ${device.online ? 'online' : 'offline'}`}
      accessibilityHint={onPress ? 'Selects this device for casting' : undefined}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Glass style={[styles.card, !device.online && styles.offlineCard]}>
        <View style={styles.header}>
          <View style={styles.nameRow}>
            <View style={styles.deviceIcon}>
              <AppIcon
                ios={device.type === 'web' ? 'laptopcomputer' : 'iphone'}
                android={device.type === 'web' ? 'laptop' : 'smartphone'}
                size={20}
                color={colors.primary}
              />
              <View style={[styles.dot, { backgroundColor: device.online ? colors.online : colors.offline }]} />
            </View>
            <Text style={[typography.headline, styles.deviceName]} numberOfLines={1}>{displayName}</Text>
          </View>
          <Text style={[styles.badge, { color: device.online ? colors.online : colors.offline }]}>
            {device.online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <Text style={[typography.caption1, styles.detail]} numberOfLines={1}>{detail}</Text>
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
  deviceIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    flex: 1,
    color: colors.text,
  },
  detail: {
    color: colors.textSecondary,
  },
  dot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  badge: {
    ...typography.footnote,
    fontWeight: '600',
  },
});
