import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import { BeamButton } from './BeamButton';
import { canUseLiquidGlass, LiquidGlassButton } from './LiquidGlassButton';
import { colors, radius, spacing, typography } from '../lib/theme';
import {
  getOfferings,
  getPriceString,
  presentCustomerCenter,
  purchasePackage,
  restorePurchases,
  PurchasesPackage,
} from '../lib/revenuecat';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete: (isPro: boolean) => void;
}

const features: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: 'infinite-outline', label: 'Unlimited devices in your domain' },
  { icon: 'globe-outline', label: 'Remote casting on any network' },
  { icon: 'sparkles-outline', label: '4K quality streaming' },
  { icon: 'people-outline', label: 'Invite guests to your domain' },
  { icon: 'film-outline', label: 'Watch party with sync playback' },
  { icon: 'lock-closed-outline', label: 'End-to-end encrypted' },
];

export function PaywallModal({ visible, onClose, onPurchaseComplete }: PaywallModalProps) {
  const [loading, setLoading] = useState('');
  const [offerings, setOfferings] = useState<{
    monthly: PurchasesPackage | null;
    yearly: PurchasesPackage | null;
    lifetime: PurchasesPackage | null;
  }>({ monthly: null, yearly: null, lifetime: null });
  const [fetchingOfferings, setFetchingOfferings] = useState(true);
  const [offeringsError, setOfferingsError] = useState('');
  const liquidGlassEnabled = canUseLiquidGlass();

  useEffect(() => {
    if (visible) loadOfferings();
  }, [visible]);

  async function loadOfferings() {
    setFetchingOfferings(true);
    setOfferingsError('');
    try {
      const result = await getOfferings();
      setOfferings(result);
    } catch {
      setOfferingsError('Plans could not be loaded. Check your connection and try again.');
    } finally {
      setFetchingOfferings(false);
    }
  }

  async function handleSubscribe(pkg: PurchasesPackage | null, label: string) {
    if (!pkg) {
      Alert.alert('Plan Unavailable', 'This plan is not available right now. Please try again later.');
      return;
    }

    setLoading(label);
    try {
      const { isPro } = await purchasePackage(pkg);
      if (isPro) {
        onPurchaseComplete(true);
        onClose();
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Purchase Failed', error?.message || 'The purchase could not be completed.');
      }
    } finally {
      setLoading('');
    }
  }

  async function handleRestore() {
    setLoading('restore');
    try {
      const { isPro } = await restorePurchases();
      if (isPro) {
        onPurchaseComplete(true);
        onClose();
      } else {
        Alert.alert('No Purchase Found', 'No active Beam Pro purchase was found.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error?.message || 'Purchases could not be restored.');
    } finally {
      setLoading('');
    }
  }

  async function handleManageSubscription() {
    try {
      await presentCustomerCenter();
    } catch (error: any) {
      Alert.alert('Unable to Open', error?.message || 'Subscription management is unavailable right now.');
    }
  }

  const yearlyPkg = offerings.yearly;
  const monthlyPkg = offerings.monthly;
  const lifetimePkg = offerings.lifetime;
  const yearlyPrice = yearlyPkg ? getPriceString(yearlyPkg) : 'Unavailable';
  const monthlyPrice = monthlyPkg ? getPriceString(monthlyPkg) : 'Unavailable';

  const pricingButtons = (
    <>
      <LiquidGlassButton
        title={`${yearlyPrice} / year (save 44%)`}
        onPress={() => handleSubscribe(yearlyPkg, 'yearly')}
        loading={loading === 'yearly'}
        disabled={!yearlyPkg}
        prominent
        style={styles.fullWidth}
      />
      <LiquidGlassButton
        title={`${monthlyPrice} / month`}
        onPress={() => handleSubscribe(monthlyPkg, 'monthly')}
        loading={loading === 'monthly'}
        disabled={!monthlyPkg}
        style={styles.fullWidth}
      />
      {lifetimePkg && (
        <LiquidGlassButton
          title={`${getPriceString(lifetimePkg)} Lifetime`}
          onPress={() => handleSubscribe(lifetimePkg, 'lifetime')}
          loading={loading === 'lifetime'}
          style={styles.fullWidth}
        />
      )}
    </>
  );

  const actionButtons = (
    <>
      {!fetchingOfferings && !offeringsError && pricingButtons}
      <View style={styles.utilityRow}>
        <LiquidGlassButton
          title="Restore"
          onPress={handleRestore}
          loading={loading === 'restore'}
          compact
          style={styles.utilityButton}
        />
        <LiquidGlassButton
          title="Manage"
          onPress={handleManageSubscription}
          compact
          style={styles.utilityButton}
        />
      </View>
      <LiquidGlassButton title="Maybe later" onPress={onClose} compact style={styles.dismissButton} />
    </>
  );

  const content = (
    <>
      <View style={styles.handle} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={[typography.largeTitle, styles.title]}>Beam Pro</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Cast your screen anywhere, to anyone, in 4K.
        </Text>

        {fetchingOfferings ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.subhead, styles.loadingText]}>Loading plans...</Text>
          </View>
        ) : offeringsError ? (
          <View style={styles.errorContainer}>
            <Text style={[typography.body, styles.errorText]}>{offeringsError}</Text>
            <BeamButton title="Try Again" onPress={loadOfferings} variant="secondary" />
          </View>
        ) : (
          <>
            <View style={styles.featureList}>
              {features.map((feature) => (
                <View key={feature.label} style={styles.featureRow}>
                  <Ionicons name={feature.icon} size={20} color={colors.primary} style={styles.featureIcon} />
                  <Text style={[typography.body, styles.featureLabel]}>{feature.label}</Text>
                </View>
              ))}
            </View>

          </>
        )}

        {liquidGlassEnabled ? (
          <GlassContainer spacing={spacing.md} style={styles.actions}>
            {actionButtons}
          </GlassContainer>
        ) : (
          <View style={styles.actions}>{actionButtons}</View>
        )}
      </ScrollView>
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {liquidGlassEnabled ? (
            <GlassView
              style={styles.sheet}
              glassEffectStyle="regular"
              colorScheme="light"
            >
              {content}
            </GlassView>
          ) : (
            <View style={[styles.sheet, styles.fallbackSheet]}>{content}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '88%',
  },
  sheet: {
    maxHeight: '100%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
  },
  fallbackSheet: {
    backgroundColor: colors.bg,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: radius.full,
    backgroundColor: colors.separatorOpaque,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  scrollContent: {
    padding: spacing.xxl,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  loadingText: {
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  featureList: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  featureRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 24,
    textAlign: 'center',
  },
  featureLabel: {
    color: colors.text,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
  utilityRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  utilityButton: {
    flex: 1,
  },
  dismissButton: {
    width: '100%',
  },
});
