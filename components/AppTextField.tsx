import { StyleSheet, TextInput } from 'react-native';
import { colors, spacing } from '../lib/theme';

export interface AppTextFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  keyboardType?: 'default' | 'email-address';
  returnKeyType?: 'done' | 'join' | 'next';
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function AppTextField({ value, onChangeText, placeholder, secure = false, autoCapitalize = 'sentences', keyboardType = 'default', returnKeyType = 'done', onSubmit, autoFocus = false }: AppTextFieldProps) {
  return (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secure}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      keyboardType={keyboardType}
      returnKeyType={returnKeyType}
      onSubmitEditing={onSubmit}
      autoFocus={autoFocus}
      accessibilityLabel={placeholder}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    height: 52,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.text,
  },
});
