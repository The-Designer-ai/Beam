import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Glass } from './Glass';
import { BeamButton } from './BeamButton';
import { colors, typography, radius, spacing } from '../lib/theme';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribeMonthly: () => void;
  onSubscribeYearly: () => void;
  onRestore: () => void;
  loading?: boolean;
}

const features = [
  { icon: '∞', label: 'Unlimited devices in your domain' },
  { icon: '🌍', label: 'Remote casting (any network)' },
  { icon: '4K', label: '4K quality streaming' },
  { icon: '👥', label: 'Invite guests to your domain' },
  { icon: '🎬', label: 'Watch party with sync playback' },
  { icon: '🔒', label: 'End-to-end encrypted' },
];

export function PaywallModal({
  visible,
  onClose,
  onSubscribeMonthly,
  onSubscribeYearly,
  onRestore,
  loading,
}: PaywallModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInUp.springify()} exiting={FadeOutDown} style={styles.container}>
          <Glass style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <Text style={[typography.largeTitle, styles.title]}>Beam Pro</Text>
            <Text style={[typography.body, styles.subtitle]}>
              Cast your screen anywhere, to anyone, in 4K.
            </Text>

            {/* Features */}
            <ScrollView style={styles.featureList} showsVerticalScrollIndicator={false}>
              {features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={[typography.body, { color: colors.text }]}>{f.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Pricing */}
            <View style={styles.pricing}>
              <BeamButton
                title="$2.99 / month"
                onPress={onSubscribeMonthly}
                loading={loading}
                style={styles.button}
              />
              <BeamButton
                title="$19.99 / year  (save 44%)"
                onPress={onSubscribeYearly}
                loading={loading}
                style={styles.button}
              />
            </View>

            {/* Restore */}
            <Pressable onPress={onRestore} style={styles.restore}>
              <Text style={[typography.footnote, { color: colors.textTertiary }]}>
                Restore Purchases
              </Text>
            </Pressable>

            {/* Dismiss */}
            <Pressable onPress={onClose} style={styles.dismiss}>
              <Text style={[typography.body, { color: colors.textTertiary }]}>
                Maybe later
              </Text>
            </Pressable>
          </Glass>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '85%',
  },
  sheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.separatorOpaque,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
  },
  featureList: {
    maxHeight: 260,
    marginBottom: spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  featureIcon: {
    width: 32,
    fontSize: 16,
    textAlign: 'center',
  },
  pricing: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
  },
  restore: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
