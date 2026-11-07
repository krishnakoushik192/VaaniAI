# Fonts

The Vaani design system uses these Google Fonts (all under the SIL Open Font License):

| File to place here | Family | Used for |
| --- | --- | --- |
| `Manrope-Regular.ttf`, `Manrope-Medium.ttf`, `Manrope-SemiBold.ttf`, `Manrope-Bold.ttf`, `Manrope-ExtraBold.ttf` | Manrope | Interface and numbers |
| `InstrumentSerif-Regular.ttf` | Instrument Serif | Premium headline on the recorder only |
| `AnekTelugu-Regular.ttf`, `AnekTelugu-Medium.ttf` | Anek Telugu | Telugu lines |

Steps:

1. Download the static `.ttf` files from fonts.google.com and put them in this folder.
2. Link them into the native projects: `npx react-native-asset`. This reads `react-native.config.js`.
3. Set `CUSTOM_FONTS_BUNDLED = true` in `src/theme/typography.ts`.
4. Rebuild the app: `npm run android` or `npm run ios`.
