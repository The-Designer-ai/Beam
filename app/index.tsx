import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors, typography } from '../lib/theme';
import { getStoredUser } from '../lib/store';

export default function SplashScreen() {
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const user = await getStoredUser();
    // Delay to show splash briefly
    setTimeout(() => {
      if (user) {
        router.replace('/(tabs)/devices');
      } else {
        router.replace('/(auth)/login');
      }
    }, 800);
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.largeTitle, { color: colors.primary }]}>Beam</Text>
      <ActivityIndicator color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginTop: 24,
  },
});
