import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, radius, spacing } from '../../lib/theme';
import { storeUser, storeAuthToken } from '../../lib/store';

/**
 * ════════════════════════════════════════════════════════════
 *   SUPABASE AUTH MIGRATION
 *
 *   When Supabase MCP is connected, replace the local mock
 *   with:
 *     const { data, error } = await supabase.auth.signInWithPassword({
 *       email, password
 *     })
 *   Keep the store calls for caching.
 * ════════════════════════════════════════════════════════════
 */

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);

    try {
      // ═══ MOCK AUTH — Replace with Supabase ═══
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 1000));

      // Mock user — Supabase will return real data here
      const mockUser = {
        id: 'user_' + Date.now(),
        email,
        displayName: email.split('@')[0],
        domain: `@${email.split('@')[0]}`,
      };

      await storeUser(mockUser);
      await storeAuthToken('mock_token_' + Date.now());

      router.replace('/(tabs)/devices');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View entering={FadeInDown.springify()} style={styles.content}>
        <Text style={[typography.largeTitle, styles.brand]}>Beam</Text>
        <Text style={[typography.body, styles.tagline]}>Cast your screen to any device.</Text>

        <Glass style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <BeamButton
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={styles.loginButton}
          />

          <BeamButton
            title="Continue with Apple"
            onPress={() => {
              // ═══ Apple Sign-In — Replace with Supabase ═══
              Alert.alert('Coming Soon', 'Apple Sign-In will be wired when Supabase MCP is connected.');
            }}
            variant="secondary"
            style={styles.loginButton}
          />
        </Glass>

        <View style={styles.footer}>
          <Text style={[typography.footnote, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <BeamButton
            title="Sign Up"
            onPress={() => router.push('/(auth)/signup')}
            variant="ghost"
            size="sm"
          />
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  brand: {
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  tagline: {
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  form: {
    width: '100%',
    marginBottom: spacing.xxl,
  },
  input: {
    height: 48,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.separator,
    marginHorizontal: spacing.lg,
  },
  loginButton: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
