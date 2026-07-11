import { withSpring, withTiming } from 'react-native-reanimated';

// ─── Spring Configs ───────────────────────────────────────────────
// Translated from apple-design skill:
//   damping 1.0 = critically damped (no bounce), response 0.3-0.4 = snappy
//   Mapping: Apple damping→Reanimated: 1.0 ≈ damping 20, 0.8 ≈ damping 12
//   response 0.3 ≈ stiffness 200, response 0.4 ≈ stiffness 150

/** Default UI spring — snappy, no bounce. Use for most transitions */
export const springDefault = (): number => {
  'worklet';
  return withSpring(0, {
    damping: 20,
    stiffness: 200,
    mass: 1,
  });
};

/** Spring for sheet/drawer motion — slight bounce for momentum feel */
export const springSheet = (): number => {
  'worklet';
  return withSpring(0, {
    damping: 14,
    stiffness: 180,
    mass: 1,
  });
};

/** Spring for gesture-driven momentum (flick, throw) */
export const springMomentum = (): number => {
  'worklet';
  return withSpring(0, {
    damping: 12,
    stiffness: 150,
    mass: 1,
  });
};

/** Rapid micro-interaction (button press, toggle) */
export const springMicro = (): number => {
  'worklet';
  return withSpring(0, {
    damping: 25,
    stiffness: 300,
    mass: 0.5,
  });
};

/** Stiff entry animation — elements arriving on screen */
export const springEntry = (): number => {
  'worklet';
  return withSpring(0, {
    damping: 22,
    stiffness: 220,
    mass: 1,
  });
};

// ─── Timing Configs ────────────────────────────────────────────────

/** Quick opacity/color transitions that shouldn't spring */
export const timingQuick = (): number => {
  'worklet';
  return withTiming(0, { duration: 150 });
};

/** Standard UI fade */
export const timingFade = (): number => {
  'worklet';
  return withTiming(0, { duration: 200 });
};

/** Slower, deliberate transitions */
export const timingSlow = (): number => {
  'worklet';
  return withTiming(0, { duration: 350 });
};

// ─── Helper: Scale from value ──────────────────────────────────────

export const scaleIn = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const slideUp = {
  initial: { translateY: 20, opacity: 0 },
  animate: { translateY: 0, opacity: 1 },
};
