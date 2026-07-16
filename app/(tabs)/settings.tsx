import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { PaywallModal } from '../../components/PaywallModal';
import { AppIcon } from '../../components/AppIcon';
import { colors, typography, spacing, radius } from '../../lib/theme';
import { getStoredUser, clearUser, getSubscription, storeSubscription } from '../../lib/store';
import { User, SubscriptionTier } from '../../types';
import {
  initRevenueCat,
  checkProStatus,
  restorePurchases,
  logOutRevenueCat,
} from '../../lib/revenuecat';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  arePushNotificationsEnabled,
} from '../../lib/notifications';

export default function SettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [u, sub, notificationsEnabled] = await Promise.all([
      getStoredUser(),
      getSubscription(),
      arePushNotificationsEnabled().catch(() => false),
    ]);
    setUser(u);
    setSubscription(sub);
    setNotifications(notificationsEnabled);
    setNotificationsLoading(false);

    // Check RevenueCat for latest subscription status
    try {
      await initRevenueCat(u?.id);
      const { isPro } = await checkProStatus();
      if (isPro && sub?.type !== 'pro') {
        setSubscription({ type: 'pro' });
      }
    } catch {
      // RevenueCat not configured yet — use local state
    }
  }

  async function handleToggleNotifications(value: boolean) {
    const previousValue = notifications;
    setNotifications(value);
    setNotificationsLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotifications();
        if (!token) {
          setNotifications(false);
          Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your iPhone Settings > Beam.'
          );
        }
      } else {
        await unregisterPushNotifications();
      }
    } catch {
      setNotifications(previousValue);
      Alert.alert('Notification Error', 'Beam could not update your notification setting. Please try again.');
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logOutRevenueCat();
          } catch {}
          await clearUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handlePurchaseComplete(isPro: boolean) {
    if (isPro) {
      setSubscription({ type: 'pro' });
      setShowPaywall(false);
      Alert.alert('Welcome to Pro!', 'You now have unlimited devices and remote casting.');
    }
  }

  async function handleRestore() {
    setPaywallLoading(true);
    try {
      const { isPro } = await restorePurchases();
      if (isPro) {
        setSubscription({ type: 'pro' });
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchase Found', 'No active subscription was found to restore.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not restore purchases.');
    } finally {
      setPaywallLoading(false);
    }
  }

  const isPro = subscription?.type === 'pro';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Settings</Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.list}
        entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      >
        {/* Profile */}
        <Glass style={styles.section}>
          <View style={styles.profileRow}>
            <View style={styles.profileIcon}>
              <AppIcon ios="person.crop.circle.fill" android="account_circle" size={38} color={colors.primary} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={[typography.headline]}>{user?.displayName || 'User'}</Text>
              <Text style={[typography.footnote, { color: colors.textSecondary }]}>{user?.email}</Text>
              <Text style={[typography.footnote, { color: colors.primary, marginTop: spacing.xs }]}>
                Domain: {user?.domain || '@user'}
              </Text>
            </View>
          </View>
        </Glass>

        {/* Subscription */}
        <Glass style={styles.section}>
          <View style={styles.subRow}>
            <View>
              <Text style={styles.sectionTitle}>Subscription</Text>
              <Text style={[typography.headline, { color: isPro ? colors.primary : colors.text }]}>
                {isPro ? 'Beam Pro' : 'Free'}
              </Text>
              {isPro && (
                <Text style={[typography.caption1, { color: colors.textTertiary }]}>
                  Unlimited devices · Remote casting · 4K
                </Text>
              )}
            </View>
            {!isPro && (
              <BeamButton
                title="Upgrade"
                onPress={() => setShowPaywall(true)}
                size="sm"
                icon={<AppIcon ios="sparkles" android="auto_awesome" size={16} color={colors.textInverse} />}
                iosSystemImage="sparkles"
              />
            )}
          </View>
          {isPro && (
            <BeamButton
              title="Manage Subscription"
              onPress={() => setShowPaywall(true)}
              variant="secondary"
              size="sm"
              icon={<AppIcon ios="creditcard" android="credit_card" size={17} color={colors.primary} />}
              iosSystemImage="creditcard"
              style={{ marginTop: spacing.md }}
            />
          )}
        </Glass>

        {/* Features */}
        <Glass style={styles.section}>
          <Text style={styles.sectionTitle}>Your Domain</Text>

          <View style={styles.featureRow}>
            <Text style={[typography.body]}>Devices</Text>
            <Text style={[typography.subhead, { color: colors.textSecondary }]}>
              {isPro ? 'Unlimited' : '2 max'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.featureRow}>
            <Text style={[typography.body]}>Remote Casting</Text>
            <Text style={[typography.subhead, { color: isPro ? colors.textSecondary : colors.textTertiary }]}>
              {isPro ? 'Enabled' : 'Same network only'}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.featureRow}>
            <Text style={[typography.body]}>Max Quality</Text>
            <Text style={[typography.subhead, { color: isPro ? colors.textSecondary : colors.textTertiary }]}>
              {isPro ? '4K' : '720p'}
            </Text>
          </View>
        </Glass>

        {/* Notifications */}
        <Glass style={styles.section}>
          <View style={styles.featureRow}>
            <Text style={[typography.body]}>Push Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              disabled={notificationsLoading}
              accessibilityLabel="Push notifications"
              trackColor={{ false: colors.separatorOpaque, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </Glass>

        {/* Sign Out */}
        <View style={styles.signOutSlot}>
          <BeamButton
            title="Sign Out"
            onPress={handleLogout}
            variant="secondary"
            icon={<AppIcon ios="rectangle.portrait.and.arrow.right" android="logout" size={18} color={colors.error} />}
            iosSystemImage="rectangle.portrait.and.arrow.right"
            role="destructive"
            textStyle={{ color: colors.error }}
          />
        </View>

        <Text style={[typography.caption2, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl }]}>
          Beam v1.0.0
        </Text>
      </Animated.ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
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
  section: {
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.footnote,
    color: colors.textTertiary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.separator,
  },
  signOutSlot: {
    minHeight: 48,
    marginTop: spacing.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
});
