import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Glass } from '../../components/Glass';
import { BeamButton } from '../../components/BeamButton';
import { colors, typography, spacing, radius } from '../../lib/theme';

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
      <Animated.View entering={FadeInDown.springify()} style={styles.content}>
        <Glass style={styles.card}>
          <Text style={[typography.title1, { color: colors.text, textAlign: 'center', marginBottom: spacing.sm }]}>
            Join Room
          </Text>
          <Text style={[typography.title2, { color: colors.primary, textAlign: 'center', marginBottom: spacing.xxl, letterSpacing: 6 }]}>
            {roomCode}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Your display name"
            placeholderTextColor={colors.textTertiary}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus
          />

          <BeamButton
            title="Join"
            onPress={handleJoin}
            loading={joining}
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  card: {
    padding: spacing.xxl,
  },
  input: {
    height: 48,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  joinButton: {
    width: '100%',
  },
});
