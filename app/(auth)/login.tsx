import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { AppTextField } from '../../components/AppTextField';
import { colors, typography, spacing } from '../../lib/theme';
import { storeUser, storeAuthToken } from '../../lib/store';

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
      // TODO: Replace this mock flow with Supabase authentication.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockUser = {
        id: `user_${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        domain: `@${email.split('@')[0]}`,
      };

      await storeUser(mockUser);
      await storeAuthToken(`mock_token_${Date.now()}`);
      router.replace('/(tabs)/devices');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
            style={styles.content}
          >
            <Text style={[typography.largeTitle, styles.brand]}>Beam</Text>
            <Text style={[typography.body, styles.tagline]}>Cast your screen to any device.</Text>

            <Glass style={styles.form} contentStyle={styles.formContent}>
              <AppTextField
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <View style={styles.divider} />
              <AppTextField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secure
              />

              <View style={styles.actions}>
                <BeamButton
                  title="Sign In"
                  onPress={handleLogin}
                  loading={loading}
                  icon={<AppIcon ios="arrow.right.circle.fill" android="arrow_circle_right" size={18} color={colors.textInverse} />}
                  iosSystemImage="arrow.right.circle.fill"
                  style={styles.button}
                />
                <BeamButton
                  title="Continue with Apple"
                  onPress={() => Alert.alert('Coming Soon', 'Apple Sign-In is not connected yet.')}
                  variant="secondary"
                  icon={<AppIcon ios="apple.logo" android="phone_iphone" size={18} color={colors.text} />}
                  iosSystemImage="apple.logo"
                  style={styles.button}
                />
              </View>
            </Glass>

            <View style={styles.footer}>
              <Text style={[typography.footnote, styles.footerText]}>Don't have an account?</Text>
              <BeamButton title="Sign Up" onPress={() => router.push('/(auth)/signup')} variant="ghost" size="sm" />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  content: { alignItems: 'center', paddingHorizontal: spacing.xxl },
  brand: { color: colors.primary, marginBottom: spacing.xs },
  tagline: { color: colors.textSecondary, marginBottom: spacing.xxxl, textAlign: 'center' },
  form: { width: '100%', maxWidth: 520, marginBottom: spacing.xxl },
  formContent: { padding: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginHorizontal: spacing.md },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  button: { width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: colors.textSecondary },
});
