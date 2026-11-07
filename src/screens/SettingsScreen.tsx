import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SectionLabel, SettingRow } from '../components/Form';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { LogoLockup } from '../components/Logo';
import { Segmented } from '../components/Segmented';
import { BottomSheet } from '../components/Sheet';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { Language } from '../data/sample';
import { whenLabel } from '../logic/dates';
import { initials, useStore } from '../store/AppStore';
import { useRouter } from '../navigation/Router';
import { radii, space, useTheme } from '../theme';
import { LANGUAGES } from './WelcomeScreen';

export function SettingsScreen() {
  const { colors, isDark, scheme, setScheme } = useTheme();
  const router = useRouter();
  const { state, updateProfile, updateSettings, resetDemo } = useStore();
  const { profile, settings } = state;
  const [langOpen, setLangOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const lang = LANGUAGES.find(l => l.key === profile.language);

  const backupNow = () => {
    if (settings.offline) {
      Alert.alert('You are offline', 'Backup will run when the phone is back online.');
      return;
    }
    setBackingUp(true);
    setTimeout(() => {
      updateSettings({ lastBackup: Date.now() });
      setBackingUp(false);
    }, 1400);
  };

  const confirmReset = () =>
    Alert.alert('Reset demo data?', 'All bills, payments and customers go back to the sample data.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          resetDemo();
          router.reset('home');
        },
      },
    ]);

  return (
    <Screen header={<AppHeader title="Profile and settings" te="ప్రొఫైల్, సెట్టింగ్‌లు" onBack={router.back} />}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${profile.ownerName}, ${profile.shopName}. Edit profile`}
        onPress={() => router.push({ name: 'editProfile' })}
        style={({ pressed }) => [styles.profile, { backgroundColor: pressed ? colors.surfaceMuted : colors.surface, borderColor: colors.line }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <T variant="sectionTitle" color={colors.primary} style={{ fontWeight: '700' }}>
            {initials(profile.ownerName)}
          </T>
        </View>
        <View style={styles.flex}>
          <T variant="sectionTitle" numberOfLines={1}>
            {profile.ownerName}
          </T>
          <T variant="supporting" color={colors.ink2} numberOfLines={1}>
            {profile.shopName}
          </T>
          <T variant="supporting" color={colors.ink2}>
            +91 {profile.phone}
          </T>
        </View>
        <View style={[styles.editPill, { borderColor: colors.lineStrong }]}>
          <Icon name="edit" size={16} color={colors.ink} />
          <T variant="bodyMedium">Edit</T>
        </View>
      </Pressable>

      <SectionLabel>SHOP</SectionLabel>
      <Card padded={false}>
        <SettingRow first icon="store" title="Shop name" value={profile.shopName} onPress={() => router.push({ name: 'editProfile' })} />
        <SettingRow icon="qr" title="UPI ID" sub="Shown on payment QR" value={profile.upiId} onPress={() => router.push({ name: 'editProfile' })} />
        <SettingRow icon="language" title="Language" te="భాష" value={lang?.native} onPress={() => setLangOpen(true)} />
      </Card>

      <SectionLabel>SECURITY</SectionLabel>
      <Card padded={false}>
        <SettingRow
          first
          icon="fingerprint"
          title="Fingerprint to confirm money"
          sub="Asked before marking a bill paid"
          toggle={settings.fingerprint}
          onToggle={v => updateSettings({ fingerprint: v })}
        />
      </Card>

      <SectionLabel>BACKUP AND SYNC</SectionLabel>
      <Card padded={false}>
        <SettingRow
          first
          icon="cloud"
          title={backingUp ? 'Backing up…' : 'Back up now'}
          sub={settings.lastBackup ? `Last backup · ${whenLabel(settings.lastBackup)}` : 'Not backed up yet'}
          onPress={backingUp ? undefined : backupNow}
        />
        <SettingRow
          icon="cloudOff"
          title="Work offline (demo)"
          sub="Saves show “Saved on this phone”"
          toggle={settings.offline}
          onToggle={v => updateSettings({ offline: v })}
        />
        <View style={[styles.syncRow, { borderTopColor: colors.line }]}>
          <T variant="supporting" color={colors.ink2}>
            Status
          </T>
          <StatusChip kind={backingUp ? 'syncing' : settings.offline ? 'offline' : 'synced'} />
        </View>
      </Card>

      <SectionLabel>APPEARANCE</SectionLabel>
      <Card style={{ gap: space[3] }}>
        <View style={styles.inline}>
          <Icon name="moon" size={20} color={colors.primary} />
          <T variant="bodyMedium" style={styles.flex}>
            Dark mode
          </T>
          <T variant="supporting" color={colors.ink2}>
            {isDark ? 'On' : 'Off'}
          </T>
        </View>
        <Segmented
          label="Dark mode"
          value={scheme}
          onChange={setScheme}
          options={[
            { key: 'system', label: 'Phone' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />
      </Card>

      <SectionLabel>SUPPORT</SectionLabel>
      <Card padded={false}>
        <SettingRow first icon="help" title="Help and support" te="సహాయం" onPress={() => router.push({ name: 'help' })} />
        <SettingRow icon="refresh" title="Reset demo data" danger onPress={confirmReset} />
      </Card>

      <View style={styles.about}>
        <LogoLockup width={140} ground={isDark ? 'dark' : 'light'} />
        <T variant="supporting" color={colors.ink2} style={{ fontWeight: '600' }}>
          Your shop. Your voice. Your business.
        </T>
        <T variant="caption" color={colors.ink2}>
          VERSION 0.1.0 · DEMO
        </T>
      </View>

      <BottomSheet visible={langOpen} onClose={() => setLangOpen(false)} title="Language" te="భాష">
        <View style={{ gap: space[2] }}>
          {LANGUAGES.map(l => {
            const on = l.key === profile.language;
            return (
              <Pressable
                key={l.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  updateProfile({ language: l.key as Language });
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
  profile: { borderWidth: 1, borderRadius: radii.md, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  editPill: { minHeight: 40, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncRow: { borderTopWidth: 1, paddingHorizontal: space[4], paddingVertical: space[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  about: { alignItems: 'center', gap: space[2], paddingVertical: space[6] },
  langRow: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center' },
});
