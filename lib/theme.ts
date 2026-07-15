import { Platform } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────
export const colors = {
  // Backgrounds
  bg: '#F2F2F7',
  bgSecondary: '#FFFFFF',
  bgTertiary: '#E5E5EA',

  // Brand / primary
  primary: '#007AFF',
  primaryLight: '#E8F2FF',
  primaryDark: '#0056B3',

  // Text
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  textInverse: '#FFFFFF',

  // Glass / material
  glassBg: '#FFFFFF',
  glassBorder: 'rgba(255, 255, 255, 0.8)',
  glassShadow: 'rgba(0, 0, 0, 0.1)',
  glassSheen: 'rgba(255, 255, 255, 0.5)',

  // States
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  online: '#34C759',
  offline: '#C7C7CC',

  // Separators
  separator: 'rgba(60, 60, 67, 0.12)',
  separatorOpaque: '#C6C6C8',
} as const;

// ─── Spacing ──────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ─── Border Radius ─────────────────────────────────────────────────
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

// ─── Typography ────────────────────────────────────────────────────
// Apple-style: system font, optical sizing via size-specific tracking
const fontFamily = Platform.select({
  ios: 'System',
  default: 'System',
});

export const typography = {
  largeTitle: {
    fontFamily,
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: 0,
    fontWeight: '700' as const,
  },
  title1: {
    fontFamily,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0,
    fontWeight: '700' as const,
  },
  title2: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },
  title3: {
    fontFamily,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },
  headline: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  callout: {
    fontFamily,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  subhead: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  footnote: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  caption1: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  caption2: {
    fontFamily,
    fontSize: 11,
    lineHeight: 13,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
} as const;

// ─── Shadows ───────────────────────────────────────────────────────
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    default: { elevation: 1 },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    default: { elevation: 3 },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    default: { elevation: 6 },
  }),
} as const;

// ─── Glass Config ──────────────────────────────────────────────────
export const glass = {
  blurIntensity: 40,
  tint: 'light' as const,
  sheenOpacity: 0.5,
  borderOpacity: 0.8,
  backgroundOpacity: 0.6,
};

// ─── Tab Bar ───────────────────────────────────────────────────────
export const tabBar = {
  contentHeight: 58,
  glassBlur: 60,
  backgroundOpacity: 0.7,
};
