import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { completeEmailConfirmation, registerCurrentDevice } from '../../lib/beam';
import { storeUser } from '../../lib/store';
import { colors, spacing, typography } from '../../lib/theme';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [message, setMessage] = useState('Confirming your Beam account...');

  useEffect(() => {
    if (!url) return;

    let active = true;
    async function confirm() {
      try {
        const profile = await completeEmailConfirmation(url!);
        await storeUser(profile);
        await registerCurrentDevice();
        if (active) router.replace('/(tabs)/devices');
      } catch (error: any) {
        if (active) {
          setMessage(error.message || 'The confirmation link is invalid or expired.');
          setTimeout(() => router.replace('/(auth)/login'), 2500);
        }
      }
    }

    confirm();
    return () => {
      active = false;
    };
  }, [url]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[typography.body, styles.message]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  message: { color: colors.textSecondary, textAlign: 'center' },
});
