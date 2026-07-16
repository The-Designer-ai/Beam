import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../lib/theme';

interface LiquidGlassButtonProps {
  title: string;
  onPress: () => void;
  prominent?: boolean;
  compact?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function canUseLiquidGlass(): boolean {
  return Platform.OS === 'ios'
    && isGlassEffectAPIAvailable()
    && isLiquidGlassAvailable();
}

export function LiquidGlassButton({
  title,
  onPress,
  prominent = false,
  compact = false,
  loading = false,
  disabled = false,
  style,
}: LiquidGlassButtonProps) {
  const isDisabled = disabled || loading;
  const handlePress = () => {
    const feedback = prominent
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
      : Haptics.selectionAsync();
    feedback.catch(() => undefined);
    onPress();
  };
  const content = loading ? (
    <ActivityIndicator color={prominent ? colors.textInverse : colors.primary} size="small" />
  ) : (
    <Text
      style={[
        styles.label,
        prominent ? styles.prominentLabel : styles.regularLabel,
        isDisabled && styles.disabledLabel,
      ]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
    >
      {title}
    </Text>
  );

  if (canUseLiquidGlass()) {
    return (
      <GlassView
        style={[styles.button, compact && styles.compactButton, style]}
        glassEffectStyle="regular"
        tintColor={prominent ? colors.primary : undefined}
        isInteractive={!isDisabled}
        colorScheme="light"
      >
        <Pressable
          onPress={handlePress}
          disabled={isDisabled}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityState={{ disabled: isDisabled, busy: loading }}
          style={styles.content}
        >
          {content}
        </Pressable>
      </GlassView>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compactButton,
        prominent ? styles.prominentFallback : styles.regularFallback,
        isDisabled && styles.disabledFallback,
        pressed && !isDisabled && styles.pressedFallback,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  compactButton: {
    height: 44,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.headline,
    textAlign: 'center',
  },
  prominentLabel: {
    color: colors.textInverse,
  },
  regularLabel: {
    color: colors.primary,
  },
  disabledLabel: {
    color: colors.textTertiary,
  },
  prominentFallback: {
    backgroundColor: colors.primary,
  },
  regularFallback: {
    backgroundColor: colors.bgSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separatorOpaque,
  },
  disabledFallback: {
    backgroundColor: colors.bgTertiary,
  },
  pressedFallback: {
    transform: [{ scale: 0.98 }],
  },
});
