import { Host, SecureField, TextField } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  font,
  frame,
  keyboardType as keyboardTypeModifier,
  onSubmit as onSubmitModifier,
  padding,
  submitLabel,
  textFieldStyle,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';
import { colors } from '../lib/theme';
import type { AppTextFieldProps } from './AppTextField';

export function AppTextField({ onChangeText, placeholder, secure = false, autoCapitalize = 'sentences', keyboardType = 'default', returnKeyType = 'done', onSubmit, autoFocus = false }: AppTextFieldProps) {
  const modifiers = [
    textFieldStyle('plain'),
    textInputAutocapitalization(autoCapitalize === 'none' ? 'never' : autoCapitalize),
    autocorrectionDisabled(true),
    keyboardTypeModifier(keyboardType),
    submitLabel(returnKeyType),
    ...(onSubmit ? [onSubmitModifier(onSubmit)] : []),
    font({ textStyle: 'body' }),
    padding({ horizontal: 12 }),
    frame({ maxWidth: 10000, minHeight: 52 }),
  ];

  return (
    <Host style={styles.host} seedColor={colors.primary}>
      {secure ? (
        <SecureField placeholder={placeholder} onTextChange={onChangeText} autoFocus={autoFocus} modifiers={modifiers} />
      ) : (
        <TextField placeholder={placeholder} onTextChange={onChangeText} autoFocus={autoFocus} modifiers={modifiers} />
      )}
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    minHeight: 52,
  },
});
