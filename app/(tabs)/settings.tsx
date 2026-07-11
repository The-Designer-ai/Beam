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
import { checkProStatus, purchasePackage, restorePurchases, getOfferings } from '../../lib/revenuecat';
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
  }

  async function handleToggleNotifications(value: boolean) {
    setNotifications(value);
    if (value) {
      const token = await registerForPushNotifications();
      if (!token) {
        // Permission denied — flip toggle back
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
          await clearUser();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function handleSubscribeMonthly() {
    setPaywallLoading(true);
    try {
      // ═══ MOCK — Replace with RevenueCat purchase when Supabase MCP is connected ═══
      // ═══ Replace with RevenueCat purchase ═══
      // const offerings = await getOfferings();
      // if (offerings?.monthly) {
      //   await purchasePackage(offerings.monthly);
      // }
      await storeSubscription({ type: 'pro' });
      setSubscription({ type: 'pro' });
      setShowPaywall(false);
      Alert.alert('Welcome to Pro!', 'You now have unlimited devices and remote casting.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setPaywallLoading(false);
    }
  }

  async function handleSubscribeYearly() {
    setPaywallLoading(true);
    try {
      await storeSubscription({ type: 'pro' });
      setSubscription({ type: 'pro' });
      setShowPaywall(false);
      Alert.alert('Welcome to Pro!', 'You now have unlimited devices and remote casting.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setPaywallLoading(false);
    }
  }

  async function handleRestore() {
    try {
      const isPro = await restorePurchases();
      if (isPro) {
        setSubscription({ type: 'pro' });
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
      } else {
        Alert.alert('No Purchase Found', 'No active subscription was found to restore.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not restore purchases.');
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
        onSubscribeMonthly={handleSubscribeMonthly}
        onSubscribeYearly={handleSubscribeYearly}
        onRestore={handleRestore}
        loading={paywallLoading}
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
