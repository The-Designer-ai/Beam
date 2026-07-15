import React, { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Host } from '@expo/ui/swift-ui';
import {
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import type { SFSymbol } from 'expo-symbols';
import { colors } from '../lib/theme';
import type { BeamButtonProps } from './BeamButton.types';

export function BeamButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  iosSystemImage,
  role = 'default',
  accessibilityLabel,
}: BeamButtonProps) {
  const isDisabled = disabled || loading;
  const resolvedStyle = StyleSheet.flatten(style);
  const stretches = resolvedStyle?.width === '100%' || resolvedStyle?.alignSelf === 'stretch';

  const handlePress = useCallback(() => {
    const feedback = variant === 'primary'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
      : Haptics.selectionAsync();
    feedback.catch(() => undefined);
    onPress();
  }, [onPress, variant]);

  if (loading) {
    return (
      <View style={[styles.host, styles[size], style]} accessibilityLabel={accessibilityLabel || title}>
        <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.primary} />
      </View>
    );
  }

  const nativeStyle = variant === 'primary' ? 'borderedProminent' : variant === 'secondary' ? 'bordered' : 'borderless';
  const nativeTint = role === 'destructive' ? colors.error : colors.primary;

  return (
    <Host
      matchContents={stretches ? { vertical: true } : true}
      style={[styles.host, styles[size], style]}
      seedColor={nativeTint}
    >
      <Button
        label={title}
        systemImage={iosSystemImage as SFSymbol | undefined}
        role={role}
        onPress={handlePress}
        modifiers={[
          buttonStyle(nativeStyle),
          buttonBorderShape('roundedRectangle', 12),
          controlSize(size === 'sm' ? 'regular' : size === 'lg' ? 'extraLarge' : 'large'),
          frame({ maxWidth: 10000, minHeight: size === 'sm' ? 44 : size === 'lg' ? 54 : 48 }),
          tint(nativeTint),
          disabledModifier(isDisabled),
        ]}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    justifyContent: 'center',
  },
  sm: { minHeight: 44 },
  md: { minHeight: 48 },
  lg: { minHeight: 54 },
});
