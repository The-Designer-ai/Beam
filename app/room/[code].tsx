import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { AppIcon } from '../../components/AppIcon';
import { AppTextField } from '../../components/AppTextField';
import { colors, typography, spacing } from '../../lib/theme';

export default function RoomScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [roomCode] = useState(code || '');
  const [displayName, setDisplayName] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin() {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Enter your name');
      return;
    }

    setJoining(true);

    try {
      // ═══ Replace with Supabase Realtime room join ═══
      await new Promise((r) => setTimeout(r, 1000));
      router.replace('/(tabs)/watch');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)} style={styles.content}>
        <Glass style={styles.card} contentStyle={styles.cardContent}>
          <Text style={[typography.title1, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
            Join Room
          </Text>
          <Text style={[typography.title2, { color: colors.primary, textAlign: 'center', marginBottom: spacing.xxl, letterSpacing: 6 }]}>
            {roomCode}
          </Text>

          <AppTextField
            placeholder="Your display name"
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
            returnKeyType="join"
            onSubmit={handleJoin}
          />

          <BeamButton
            title="Join"
            onPress={handleJoin}
            loading={joining}
            icon={<AppIcon ios="arrow.right.circle.fill" android="arrow_circle_right" size={18} color={colors.textInverse} />}
            iosSystemImage="arrow.right.circle.fill"
            style={styles.joinButton}
          />

          <BeamButton
            title="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            style={{ marginTop: spacing.sm }}
          />
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  cardContent: {
    padding: spacing.xxl,
    width: '100%',
  },
  joinButton: {
    width: '100%',
    marginTop: spacing.lg,
  },
});
