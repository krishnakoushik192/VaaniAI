import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { LogoLockup } from '../components/Logo';
import { T } from '../components/Text';
import { Language } from '../data/types';
import { LANGUAGES, translate } from '../i18n';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const BADGE: Record<Language, string> = { te: 'తె', hi: 'हि', en: 'En' };

/** First run: logo, tagline, choose language. Tapping a language moves straight on. */
export function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const { state, onboard } = useStore();
  const tr = (key: Parameters<typeof translate>[1]) => translate(state.language, key);

  return (
    <Screen
      footer={
        <T variant="supporting" color={colors.ink2} style={styles.center}>
          {tr('welcome.changeLater')}
        </T>
      }>
      <View style={styles.hero}>
        <LogoLockup width={200} ground={isDark ? 'dark' : 'light'} />
        <T variant="body" color={colors.ink2} style={styles.tagline}>
          {tr('welcome.tagline')}
        </T>
      </View>

      <View style={{ gap: 4 }}>
        <T variant="screenTitle">{tr('welcome.chooseLanguage')}</T>
        <T variant="supporting" color={colors.ink2}>
          {tr('welcome.tapOne')}
        </T>
      </View>

      <View accessibilityRole="radiogroup" style={{ gap: space[3] }}>
        {LANGUAGES.map(l => (
          <Pressable
            key={l.key}
            accessibilityRole="button"
            accessibilityLabel={l.en}
            onPress={() => onboard(l.key)}
            style={({ pressed }) => [
              styles.option,
              { borderColor: pressed ? colors.primary : colors.line, backgroundColor: pressed ? colors.primarySoft : colors.surface },
            ]}>
            <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <T variant="sectionTitle" color={colors.primary} style={styles.bold}>
                {BADGE[l.key]}
              </T>
            </View>
            <View style={styles.flex}>
              <T variant="sectionTitle" style={styles.bold}>
                {l.native}
              </T>
              <T variant="supporting" color={colors.ink2}>
                {l.en}
              </T>
            </View>
            <Icon name="chevronRight" size={20} color={colors.ink2} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: space[3], paddingTop: space[8], paddingBottom: space[2] },
  tagline: { fontWeight: '600', textAlign: 'center' },
  option: { minHeight: 76, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: space[4], paddingVertical: space[3], flexDirection: 'row', alignItems: 'center', gap: space[4] },
  badge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
