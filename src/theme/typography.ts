import { TextStyle } from 'react-native';

/**
 * Set to true once the font files are bundled (see src/assets/fonts/README.md).
 * Until then the platform font is used so the app never breaks on a missing family.
 */
export const CUSTOM_FONTS_BUNDLED = false;

const f = (name: string): string | undefined =>
  CUSTOM_FONTS_BUNDLED ? name : undefined;

export const fonts = {
  regular: f('Manrope-Regular'),
  medium: f('Manrope-Medium'),
  semibold: f('Manrope-SemiBold'),
  bold: f('Manrope-Bold'),
  extrabold: f('Manrope-ExtraBold'),
  serif: f('InstrumentSerif-Regular'),
  telugu: f('AnekTelugu-Regular'),
  teluguMedium: f('AnekTelugu-Medium'),
};

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  displayAmount: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    ...tabular,
  },
  displaySerif: {
    fontFamily: fonts.serif ?? 'serif',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '400',
  },
  screenTitle: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyMedium: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  button: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  supporting: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  teLine: { fontFamily: fonts.telugu, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  teTitle: { fontFamily: fonts.teluguMedium, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  amount: { ...tabular },
} satisfies Record<string, TextStyle>;
