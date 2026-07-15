import { Host, TextField } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  font,
  frame,
  multilineTextAlignment,
  onSubmit,
  submitLabel,
  textFieldStyle,
  textInputAutocapitalization,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

interface RoomCodeFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
}

export function RoomCodeField({ value, onChangeText, onSubmit: handleSubmit }: RoomCodeFieldProps) {
  return (
    <Host style={styles.host} seedColor={colors.primary}>
      <TextField
        placeholder="Enter room code"
        maxLength={6}
        onTextChange={(nextValue) => onChangeText(nextValue.toUpperCase())}
        modifiers={[
          textFieldStyle('roundedBorder'),
          textInputAutocapitalization('characters'),
          autocorrectionDisabled(true),
          submitLabel('join'),
          onSubmit(handleSubmit),
          multilineTextAlignment('center'),
          font({ size: 24, weight: 'semibold', design: 'rounded' }),
          frame({ maxWidth: 10000, minHeight: 56 }),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    minHeight: 56,
  },
});
