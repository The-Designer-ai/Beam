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
import { storeUser } from '../../lib/store';
import { getCurrentProfile, registerCurrentDevice, signUpWithEmail } from '../../lib/beam';

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
      await signUpWithEmail(email.trim(), password, name.trim());
      const profile = await getCurrentProfile();
      if (profile) await storeUser(profile);
      await registerCurrentDevice();
      router.replace('/(tabs)/devices');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Signup failed');
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
            <Text style={[typography.largeTitle, styles.brand]}>Create Account</Text>
            <Text style={[typography.body, styles.tagline]}>Join Beam and start casting.</Text>

            <Glass style={styles.form} contentStyle={styles.formContent}>
              <AppTextField
                placeholder="Display Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <View style={styles.divider} />
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

              <BeamButton
                title="Create Account"
                onPress={handleSignup}
                loading={loading}
                icon={<AppIcon ios="person.badge.plus" android="person_add" size={18} color={colors.textInverse} />}
                iosSystemImage="person.badge.plus"
                style={styles.signupButton}
              />
            </Glass>

            <View style={styles.footer}>
              <Text style={[typography.footnote, styles.footerText]}>Already have an account?</Text>
              <BeamButton title="Sign In" onPress={() => router.back()} variant="ghost" size="sm" />
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
  brand: { color: colors.primary, marginBottom: spacing.xs, textAlign: 'center' },
  tagline: { color: colors.textSecondary, marginBottom: spacing.xxxl, textAlign: 'center' },
  form: { width: '100%', maxWidth: 520, marginBottom: spacing.xxl },
  formContent: { padding: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginHorizontal: spacing.md },
  signupButton: { marginTop: spacing.lg, width: '100%' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: colors.textSecondary },
});
