import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius, shadows, glass } from '../lib/theme';

interface GlassProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'extraLight';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

/**
 * Liquid glass surface — frosted blur + white sheen gradient + bright edge highlight.
 * This is the core visual material of Beam, inspired by iOS Control Center / Dock.
 */
export function Glass({
  children,
  intensity = glass.blurIntensity,
  tint = glass.tint,
  style,
  contentStyle,
  noPadding,
}: GlassProps) {
  return (
    <View style={[styles.container, shadows.sm, style]}>
      <BlurView
        intensity={intensity}
        tint={tint}
        style={StyleSheet.absoluteFill}
      />
      {/* White sheen overlay — gives the "liquid" depth */}
      <View style={styles.sheen} />
      {/* Bright top edge highlight — light catching the glass */}
      <View style={styles.edgeHighlight} />
      {/* Content */}
      <View style={[styles.content, noPadding && styles.noPadding, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.glassBg,
  },
  sheen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.glassSheen,
    opacity: 0.3,
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.glassBorder,
  },
  content: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  },
});
