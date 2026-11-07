// Vaani design system colour tokens (tokens.json v2).
// Dark mode is a full theme with its own values, not an inversion.

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  ink2: string;
  line: string;
  lineStrong: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  primarySoft: string;
  success: string;
  successText: string;
  successSoft: string;
  warning: string;
  warningText: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  premium: string;
  onPremium: string;
  premiumMuted: string;
  premiumAccent: string;
  premiumLine: string;
  qrInk: string;
  qrGround: string;
};

export const lightColors: ColorTokens = {
  bg: '#f6f8fc',
  surface: '#ffffff',
  surfaceMuted: '#f1f4f9',
  ink: '#151922',
  ink2: '#5d6679',
  line: '#e6eaf0',
  lineStrong: '#828ca0',
  primary: '#1769e0',
  primaryPressed: '#104da8',
  onPrimary: '#ffffff',
  primarySoft: '#eaf2ff',
  success: '#16834a',
  successText: '#12703f',
  successSoft: '#e8f7ef',
  warning: '#b7791f',
  warningText: '#8f5c0f',
  warningSoft: '#fff5df',
  danger: '#c93636',
  dangerSoft: '#fdecec',
  premium: '#111827',
  onPremium: '#f3f5f8',
  premiumMuted: '#a5afbd',
  premiumAccent: '#c9a96e',
  premiumLine: '#2a3344',
  qrInk: '#000000',
  qrGround: '#ffffff',
};

export const darkColors: ColorTokens = {
  bg: '#0d1117',
  surface: '#161d27',
  surfaceMuted: '#202938',
  ink: '#f3f5f8',
  ink2: '#a5afbd',
  line: '#303b4a',
  lineStrong: '#6b7789',
  primary: '#6ea8ff',
  primaryPressed: '#4b8ef5',
  onPrimary: '#0d1117',
  primarySoft: '#17294a',
  success: '#54c58a',
  successText: '#54c58a',
  successSoft: '#123323',
  warning: '#f0bd5a',
  warningText: '#f0bd5a',
  warningSoft: '#382a10',
  danger: '#ff7777',
  dangerSoft: '#3d1c1f',
  premium: '#1a2231',
  onPremium: '#f3f5f8',
  premiumMuted: '#a5afbd',
  premiumAccent: '#d4b47a',
  premiumLine: '#4a3f2a',
  qrInk: '#000000',
  qrGround: '#ffffff',
};
