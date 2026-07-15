import { StyleSheet, TextInput } from 'react-native';
import { colors, radius } from '../lib/theme';

interface RoomCodeFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function RoomCodeField({ value, onChangeText, onSubmit }: RoomCodeFieldProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder="Enter room code"
      placeholderTextColor={colors.textTertiary}
      value={value}
      onChangeText={(nextValue) => onChangeText(nextValue.toUpperCase())}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={6}
      returnKeyType="join"
      onSubmitEditing={onSubmit}
      accessibilityLabel="Room code"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 56,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 0,
    textAlign: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    color: colors.text,
    fontWeight: '600',
  },
});
