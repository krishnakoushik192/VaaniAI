import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SectionLabel, SettingRow } from '../components/Form';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { LogoLockup } from '../components/Logo';
import { Segmented } from '../components/Segmented';
import { BottomSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { LANGUAGES, useT } from '../i18n';
import { useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const APP_VERSION = '0.2.0';

export function SettingsScreen() {
  const { colors, isDark, scheme, setScheme } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, setLanguage, updateSettings, logout } = useStore();
  const { shop, settings } = state;
  const [langOpen, setLangOpen] = useState(false);

  const lang = LANGUAGES.find(l => l.key === state.language);

  const confirmLogout = () =>
    Alert.alert(t('set.logoutQ'), t('set.logoutBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('set.logout'), style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen header={<AppHeader title={t('set.title')} onBack={router.back} />}>
      {shop && !shop.upiId ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ name: 'upi' })}
          style={({ pressed }) => [styles.upiBanner, { backgroundColor: pressed ? colors.surfaceMuted : colors.warningSoft, borderColor: colors.warning }]}>
          <View style={[styles.upiWell, { backgroundColor: colors.surface }]}>
            <Icon name="qr" size={22} color={colors.warningText} />
          </View>
          <View style={styles.flex}>
            <T variant="sectionTitle" color={colors.warningText} style={styles.bold}>
              {t('set.upiMissing')}
            </T>
            <T variant="supporting" color={colors.warningText}>
              {t('set.upiMissingSub')}
            </T>
          </View>
          <T variant="button" color={colors.primary}>
            {t('home.setupAdd')}
          </T>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${shop?.shopkeeperName ?? ''}, ${shop?.shopName ?? ''}. ${t('common.edit')}`}
        onPress={() => router.push({ name: 'editProfile' })}
        style={({ pressed }) => [styles.profile, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.line }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <T variant="sectionTitle" color={colors.primary} style={styles.bold}>
            {initials(shop?.shopkeeperName ?? '')}
          </T>
        </View>
        <View style={styles.flex}>
          <T variant="sectionTitle" numberOfLines={1}>
            {shop?.shopkeeperName}
          </T>
          <T variant="supporting" color={colors.ink2} numberOfLines={1}>
            {shop?.shopName}
          </T>
          <T variant="supporting" color={colors.ink2}>
            +91 {shop?.mobileNumber}
          </T>
        </View>
        <View style={[styles.editPill, { borderColor: colors.lineStrong }]}>
          <Icon name="edit" size={16} color={colors.ink} />
          <T variant="bodyMedium">{t('common.edit')}</T>
        </View>
      </Pressable>

      <SectionLabel>{t('set.shop')}</SectionLabel>
      <Card padded={false}>
        <SettingRow first icon="store" title={t('set.shopName')} value={shop?.shopName} onPress={() => router.push({ name: 'editProfile' })} />
        <SettingRow icon="user" title={t('set.yourName')} value={shop?.shopkeeperName} onPress={() => router.push({ name: 'editProfile' })} />
        <SettingRow
          icon="qr"
          title={t('set.upiId')}
          sub={shop?.upiId ? t('set.upiSub') : t('set.upiMissingSub')}
          value={shop?.upiId ?? t('set.notSet')}
          onPress={() => router.push({ name: 'upi' })}
        />
        <SettingRow icon="language" title={t('set.language')} value={lang?.native} onPress={() => setLangOpen(true)} />
      </Card>

      <SectionLabel>{t('set.voice')}</SectionLabel>
      <Card padded={false}>
        <SettingRow
          first
          icon="speaker"
          title={t('set.readBack')}
          sub={t('set.readBackSub')}
          toggle={settings.readBack}
          onToggle={v => updateSettings({ readBack: v })}
        />
        <SettingRow
          icon="receipt"
          title={t('set.readAll')}
          sub={t('set.readAllSub')}
          toggle={settings.readAll}
          onToggle={v => updateSettings({ readAll: v })}
        />
      </Card>

      <SectionLabel>{t('set.appearance')}</SectionLabel>
      <Card style={{ gap: space[3] }}>
        <View style={styles.inline}>
          <Icon name="moon" size={20} color={colors.primary} />
          <T variant="bodyMedium" style={styles.flex}>
            {t('set.darkMode')}
          </T>
          <T variant="supporting" color={colors.ink2}>
            {isDark ? t('set.on') : t('set.off')}
          </T>
        </View>
        <Segmented
          label={t('set.darkMode')}
          value={scheme}
          onChange={setScheme}
          options={[
            { key: 'system', label: t('set.schemePhone') },
            { key: 'light', label: t('set.schemeLight') },
            { key: 'dark', label: t('set.schemeDark') },
          ]}
        />
      </Card>

      <SectionLabel>{t('set.support')}</SectionLabel>
      <Card padded={false}>
        <SettingRow first icon="help" title={t('set.help')} onPress={() => router.push({ name: 'help' })} />
      </Card>

      <SectionLabel>{t('set.account')}</SectionLabel>
      <Card padded={false}>
        <SettingRow first icon="close" title={t('set.logout')} danger onPress={confirmLogout} />
      </Card>

      <View style={styles.about}>
        <LogoLockup width={140} ground={isDark ? 'dark' : 'light'} />
        <T variant="supporting" color={colors.ink2} style={styles.semibold}>
          {t('welcome.tagline')}
        </T>
        <T variant="caption" color={colors.ink2}>
          {t('set.version', { v: APP_VERSION })}
        </T>
      </View>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('set.language')}>
        <View style={{ gap: space[2] }}>
          {LANGUAGES.map(l => {
            const on = l.key === state.language;
            return (
              <Pressable
                key={l.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.en}
                onPress={() => {
                  setLanguage(l.key);
                  setLangOpen(false);
                }}
                style={[styles.langRow, { borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primarySoft : colors.surface }]}>
                <T variant="sectionTitle" style={styles.flex}>
                  {l.native}
                </T>
                {on ? <Icon name="check" size={20} color={colors.primary} strokeWidth={2.4} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  upiBanner: { borderWidth: 1, borderRadius: radii.md, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  upiWell: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  profile: { borderWidth: 1, borderRadius: radii.md, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  editPill: { minHeight: 40, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: 6 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  about: { alignItems: 'center', gap: space[2], paddingVertical: space[6] },
  langRow: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center' },
});
