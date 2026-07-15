import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import {
  AndroidSymbol,
  SFSymbol,
  SymbolView,
  SymbolViewProps,
} from 'expo-symbols';

interface AppIconProps {
  ios: SFSymbol;
  android: AndroidSymbol;
  size?: number;
  color?: SymbolViewProps['tintColor'];
  type?: SymbolViewProps['type'];
  weight?: SymbolViewProps['weight'];
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({
  ios,
  android,
  size = 22,
  color,
  type = 'monochrome',
  weight = 'regular',
  style,
}: AppIconProps) {
  return (
    <SymbolView
      name={{ ios, android, web: android }}
      size={size}
      tintColor={color}
      type={type}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={[{ width: size, height: size }, style]}
    />
  );
}
