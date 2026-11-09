import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { T } from '../components/Text';
import { UpiField } from '../components/UpiField';
import { errorText, useT } from '../i18n';
import { isValidUpi, normalizeUpi } from '../logic/upi';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

/** Its own small screen for the UPI ID (from Home's setup card, Settings and the payment QR). */
export function UpiScreen() {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, updateProfile } = useStore();
  const saved = state.shop?.upiId ?? '';
  const [upi, setUpi] = useState(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidUpi(upi);
  const changed = normalizeUpi(upi) !== saved;

  const save = async () => {
    if (!valid || !changed || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ upiId: normalizeUpi(upi) });
      router.back();
    } catch (e) {
      setError(errorText(t, e));
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<AppHeader title={t('upi.title')} onBack={router.back} />}
      footer={<Button label={saving ? t('common.saving') : t('upi.save')} onPress={save} disabled={!valid || !changed || saving} />}>
      {error ? <ErrorBanner message={error} onRetry={save} /> : null}
      <UpiField value={upi} onChangeText={setUpi} autoFocus={!saved} />
      <UpiPreview vpa={valid ? normalizeUpi(upi) : null} payee={state.shop?.shopName ?? ''} />
      <T variant="supporting" color={colors.ink2}>
        {t('prof.upiHelp')}
      </T>
    </Screen>
  );
}

/** What customers will scan: a real QR once the ID looks right. */
export function UpiPreview({ vpa, payee }: { vpa: string | null; payee: string }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <Card style={styles.preview}>
      <View style={[styles.qr, { backgroundColor: vpa ? colors.qrGround : colors.surfaceMuted }]}>
        {vpa ? (
          <QRCode value={`upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&cu=INR`} size={80} color={colors.qrInk} backgroundColor={colors.qrGround} />
        ) : (
          <Icon name="qr" size={48} color={colors.lineStrong} />
        )}
      </View>
      <View style={styles.flex}>
        <T variant="caption" color={colors.ink2}>
          {t('upi.preview')}
        </T>
        <T variant="bodyMedium">{t('upi.previewBody')}</T>
        {!vpa ? (
          <T variant="supporting" color={colors.ink2}>
            {t('upi.previewWait')}
          </T>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
  qr: { width: 96, height: 96, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
