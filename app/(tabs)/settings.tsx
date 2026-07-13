import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { PaywallModal } from '../../components/PaywallModal';
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
  getStoredPushToken,
} from '../../lib/notifications';

export default function SettingsScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const u = await getStoredUser();
    const sub = await getSubscription();
    setUser(u);
    setSubscription(sub);

    // Check RevenueCat for latest subscription status
    try {
      const { isPro } = await checkProStatus();
      if (isPro && sub?.type !== 'pro') {
        setSubscription({ type: 'pro' });
      }
    } catch {
      // RevenueCat not configured yet — use local state
    }
  }

  async function handleToggleNotifications(value: boolean) {
    setNotifications(value);
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
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <Text style={[typography.largeTitle, { color: colors.text }]}>Settings</Text>
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={styles.list}
        entering={FadeInDown.delay(100).springify()}
      >
        {/* Profile */}
        <Glass style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={[typography.headline]}>{user?.displayName || 'User'}</Text>
          <Text style={[typography.footnote, { color: colors.textSecondary }]}>{user?.email}</Text>
          <Text style={[typography.footnote, { color: colors.primary, marginTop: spacing.xs }]}>
            Domain: {user?.domain || '@user'}
          </Text>
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
              />
            )}
          </View>
          {isPro && (
            <BeamButton
              title="Manage Subscription"
              onPress={() => setShowPaywall(true)}
              variant="secondary"
              size="sm"
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
              trackColor={{ false: colors.separatorOpaque, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
        </Glass>

        {/* Sign Out */}
        <BeamButton
          title="Sign Out"
          onPress={handleLogout}
          variant="secondary"
          style={{ marginTop: spacing.lg }}
        />

        <Text style={[typography.caption2, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xxl }]}>
          Beam v1.0.0
        </Text>
      </Animated.ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
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
  section: {
    marginBottom: spacing.md,
    padding: spacing.lg,
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
});
