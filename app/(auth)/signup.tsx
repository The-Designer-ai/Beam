import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, spacing } from '../../lib/theme';
import { storeUser, storeAuthToken } from '../../lib/store';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // ═══ MOCK AUTH — Replace with Supabase ═══
      await new Promise((r) => setTimeout(r, 1000));

      const mockUser = {
        id: 'user_' + Date.now(),
        email,
        displayName: name,
        domain: `@${name.toLowerCase().replace(/\s+/g, '')}`,
      };

      await storeUser(mockUser);
      await storeAuthToken('mock_token_' + Date.now());

      router.replace('/(tabs)/devices');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Signup failed');
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
        <Text style={[typography.largeTitle, styles.brand]}>Create Account</Text>
        <Text style={[typography.body, styles.tagline]}>Join Beam and start casting.</Text>

        <Glass style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            placeholderTextColor={colors.textTertiary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <View style={styles.divider} />
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
            autoComplete="new-password"
          />

          <BeamButton
            title="Create Account"
            onPress={handleSignup}
            loading={loading}
            style={styles.signupButton}
          />
        </Glass>

        <View style={styles.footer}>
          <Text style={[typography.footnote, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <BeamButton
            title="Sign In"
            onPress={() => router.back()}
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
  signupButton: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
