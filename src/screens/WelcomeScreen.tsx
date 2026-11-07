import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { LogoLockup } from '../components/Logo';
import { Bi, T } from '../components/Text';
import { Language } from '../data/sample';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

export const LANGUAGES: { key: Language; native: string; en: string }[] = [
  { key: 'te', native: 'తెలుగు', en: 'Telugu' },
  { key: 'en', native: 'English', en: 'English' },
  { key: 'hi', native: 'हिन्दी', en: 'Hindi' },
];

/** First run: lockup, tagline, choose language. */
export function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const { state, onboard } = useStore();
  const [lang, setLang] = useState<Language>(state.profile.language);

  return (
    <Screen footer={<Button label="Continue" te="కొనసాగించండి" onPress={() => onboard(lang)} />}>
      <View style={styles.hero}>
        <LogoLockup width={220} ground={isDark ? 'dark' : 'light'} />
        <T variant="body" color={colors.ink2} style={styles.tagline}>
          Your shop. Your voice. Your business.
        </T>
      </View>

      <Bi en="Choose your language" te="మీ భాషను ఎంచుకోండి" variant="sectionTitle" />
      <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
        {LANGUAGES.map(l => {
          const on = l.key === lang;
          return (
            <Pressable
              key={l.key}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={l.en}
              onPress={() => setLang(l.key)}
              style={[
                styles.option,
                { borderColor: on ? colors.primary : colors.line, borderWidth: on ? 2 : 1, backgroundColor: on ? colors.primarySoft : colors.surface },
              ]}>
              <View style={styles.flex}>
                <T variant="sectionTitle">{l.native}</T>
                {l.native !== l.en ? (
                  <T variant="supporting" color={colors.ink2}>
                    {l.en}
                  </T>
                ) : null}
              </View>
              <View style={[styles.radio, { borderColor: on ? colors.primary : colors.lineStrong, backgroundColor: on ? colors.primary : 'transparent' }]}>
                {on ? <Icon name="check" size={14} color={colors.onPrimary} strokeWidth={2.6} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: 'center', gap: space[3], paddingTop: space[10], paddingBottom: space[6] },
  tagline: { fontWeight: '600', textAlign: 'center' },
  option: { minHeight: 64, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[3], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  radio: { width: 24, height: 24, borderRadius: radii.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
