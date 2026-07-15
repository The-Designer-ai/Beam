import type React from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

export interface BeamButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  iosSystemImage?: string;
  role?: 'default' | 'destructive' | 'cancel';
  accessibilityLabel?: string;
}
