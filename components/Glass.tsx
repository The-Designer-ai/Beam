import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radius } from '../lib/theme';

interface GlassProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

// Grouped system surface for readable content. Real Liquid Glass is reserved
// for native iOS controls and the paywall.
export function Glass({ children, style, contentStyle, noPadding }: GlassProps) {
  return (
    <View style={[styles.container, style]}>
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
    backgroundColor: colors.bgSecondary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
  },
  content: {
    padding: 16,
  },
  noPadding: {
    padding: 0,
  },
});
