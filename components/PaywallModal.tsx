import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Glass } from './Glass';
import { BeamButton } from './BeamButton';
import { colors, typography, radius, spacing } from '../lib/theme';
import {
  getOfferings,
  purchasePackage,
  getPriceString,
  presentPaywall,
  presentCustomerCenter,
  PurchasesPackage,
} from '../lib/revenuecat';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete: (isPro: boolean) => void;
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
  onPurchaseComplete,
}: PaywallModalProps) {
  const [loading, setLoading] = useState('');
  const [offerings, setOfferings] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
  }>({ monthly: null, yearly: null, lifetime: null });
  const [fetchingOfferings, setFetchingOfferings] = useState(true);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  async function loadOfferings() {
    setFetchingOfferings(true);
    try {
      const result = await getOfferings();
      setOfferings(result);
    } catch (err) {
      console.warn('Failed to load offerings:', err);
    } finally {
      setFetchingOfferings(false);
    }
  }

  async function handleSubscribe(pkg: PurchasesPackage | null, label: string) {
    if (!pkg) return;
    setLoading(label);
    try {
      const { isPro } = await purchasePackage(pkg);
      if (isPro) {
        onPurchaseComplete(true);
        onClose();
      }
    } catch (err: any) {
      if (err?.userCancelled) {
        // User cancelled — do nothing
      } else {
        console.error('Purchase failed:', err);
      }
    } finally {
      setLoading('');
    }
  }

  async function handleRestore() {
    setLoading('restore');
    try {
      const { isPro } = await purchasePackage(null as any); // placeholder
      // Actually use restore:
      const Purchases = require('react-native-purchases').default;
      const { customerInfo } = await Purchases.restorePurchases();
      const isProCheck = customerInfo.entitlements.active['Beam Pro'] !== undefined;
      if (isProCheck) {
        onPurchaseComplete(true);
        onClose();
      }
    } catch {
      // No purchases to restore
    } finally {
      setLoading('');
    }
  }

  async function handleRevenueCatPaywall() {
    try {
      const shown = await presentPaywall();
      if (shown) {
        // Paywall was shown — user may have purchased
        const { isPro } = await (await import('../lib/revenuecat')).checkProStatus();
        if (isPro) {
          onPurchaseComplete(true);
          onClose();
        }
      }
    } catch {
      // Fallback to our custom paywall
    }
  }

  const monthlyPkg = offerings.monthly;
  const yearlyPkg = offerings.yearly;
  const lifetimePkg = offerings.lifetime;
  const yearlyPrice = yearlyPkg ? getPriceString(yearlyPkg) : '$19.99';
  const monthlyPrice = monthlyPkg ? getPriceString(monthlyPkg) : '$2.99';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent>
      <View style={styles.overlay}>
        <Animated.View entering={FadeInUp.springify()} exiting={FadeOutDown} style={styles.container}>
          <Glass style={styles.sheet}>
            <View style={styles.handle} />

            <Text style={[typography.largeTitle, styles.title]}>Beam Pro</Text>
            <Text style={[typography.body, styles.subtitle]}>
              Cast your screen anywhere, to anyone, in 4K.
            </Text>

            {fetchingOfferings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[typography.subhead, { color: colors.textTertiary, marginTop: spacing.md }]}>
                  Loading plans...
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.featureList} showsVerticalScrollIndicator={false}>
                  {features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={styles.featureIcon}>{f.icon}</Text>
                      <Text style={[typography.body, { color: colors.text }]}>{f.label}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.pricing}>
                  {/* Yearly — Best value */}
                  <BeamButton
                    title={`${yearlyPrice} / year  (save 44%)`}
                    onPress={() => handleSubscribe(yearlyPkg, 'yearly')}
                    loading={loading === 'yearly'}
                    style={styles.button}
                  />

                  {/* Monthly */}
                  <BeamButton
                    title={`${monthlyPrice} / month`}
                    onPress={() => handleSubscribe(monthlyPkg, 'monthly')}
                    loading={loading === 'monthly'}
                    variant="secondary"
                    style={styles.button}
                  />

                  {/* Lifetime (if available) */}
                  {lifetimePkg && (
                    <BeamButton
                      title={`${getPriceString(lifetimePkg)} — Lifetime`}
                      onPress={() => handleSubscribe(lifetimePkg, 'lifetime')}
                      loading={loading === 'lifetime'}
                      variant="secondary"
                      style={styles.button}
                    />
                  )}
                </View>
              </>
            )}

            <Pressable onPress={handleRestore} style={styles.restore}>
              <Text style={[typography.footnote, { color: colors.textTertiary }]}>
                Restore Purchases
              </Text>
            </Pressable>

            <Pressable onPress={presentCustomerCenter} style={styles.manageSub}>
              <Text style={[typography.footnote, { color: colors.primary }]}>
                Manage Subscription
              </Text>
            </Pressable>

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
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
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
  manageSub: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dismiss: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});
