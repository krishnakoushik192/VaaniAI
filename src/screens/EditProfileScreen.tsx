import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { TextField } from '../components/Form';
import { AppHeader, Screen } from '../components/Layout';
import { LogoMark } from '../components/Logo';
import { T } from '../components/Text';
import { errorText, useT } from '../i18n';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const UPI_RE = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

export function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, updateProfile } = useStore();
  const p = state.shop;

  const [shopName, setShopName] = useState(p?.shopName ?? '');
  const [ownerName, setOwnerName] = useState(p?.shopkeeperName ?? '');
  const [upiId, setUpiId] = useState(p?.upiId ?? '');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errors = {
    shopName: shopName.trim().length < 2 ? t('prof.errShop') : undefined,
    ownerName: ownerName.trim().length < 2 ? t('prof.errName') : undefined,
    upiId: upiId && !UPI_RE.test(upiId.trim()) ? t('prof.errUpi') : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const changed = shopName !== (p?.shopName ?? '') || ownerName !== (p?.shopkeeperName ?? '') || upiId !== (p?.upiId ?? '');

  const save = async () => {
    setTried(true);
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ shopName: shopName.trim(), shopkeeperName: ownerName.trim(), upiId: upiId.trim() });
      router.back();
    } catch (e) {
      setError(errorText(t, e));
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Screen
        header={<AppHeader title={t('prof.title')} onBack={router.back} />}
        footer={<Button label={saving ? t('common.saving') : t('prof.save')} onPress={save} disabled={!changed || saving} />}>
        {error ? <ErrorBanner message={error} onRetry={save} /> : null}
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <LogoMark size={40} ground={isDark ? 'dark' : 'light'} />
          <View style={styles.flex}>
            <T variant="sectionTitle" numberOfLines={1} style={styles.bold}>
              {shopName.trim() || t('prof.shopName')}
            </T>
            <T variant="supporting" color={colors.ink2} numberOfLines={1}>
              {ownerName.trim() || t('prof.ownerName')}
            </T>
          </View>
        </View>
        <T variant="caption" color={colors.ink2}>
          {t('prof.preview')}
        </T>

        <TextField
          label={t('prof.shopName')}
          value={shopName}
          onChangeText={setShopName}
          maxLength={60}
          autoCapitalize="words"
          error={tried ? errors.shopName : undefined}
          help={t('prof.shopNameHelp')}
        />
        <TextField
          label={t('prof.ownerName')}
          value={ownerName}
          onChangeText={setOwnerName}
          maxLength={60}
          autoCapitalize="words"
          error={tried ? errors.ownerName : undefined}
        />
        <TextField label={t('prof.mobile')} value={p?.mobileNumber ?? ''} onChangeText={() => {}} prefix="+91" editable={false} help={t('prof.mobileHelp')} />
        <TextField
          label={t('prof.upiId')}
          value={upiId}
          onChangeText={setUpiId}
          autoCapitalize="none"
          keyboardType="email-address"
          error={tried ? errors.upiId : undefined}
          help={t('prof.upiHelp')}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  preview: { borderWidth: 1, borderRadius: radii.md, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: -space[3] },
});
