// 8-point rhythm, sizes, radii, motion — Vaani tokens.

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20, // screen gutter
  6: 24,
  8: 32,
  10: 40,
} as const;

export const size = {
  touchMin: 48,
  buttonH: 56,
  buttonHSm: 48,
  mic: 96,
  headerH: 56,
  tabbarH: 64,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const duration = {
  fast: 150,
  base: 220,
} as const;
