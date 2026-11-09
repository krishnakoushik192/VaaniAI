import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { errorText, useT } from '../i18n';
import { isValidUpi, normalizeUpi } from '../logic/upi';
import { useStore } from '../store/AppStore';
import { space, useTheme } from '../theme';
import { Button } from './Button';
import { ErrorBanner } from './Feedback';
import { BottomSheet } from './Sheet';
import { T } from './Text';
import { UpiField } from './UpiField';

/**
 * UPI chosen for a bill but no UPI ID saved yet: add it here without leaving the bill.
 * "Save and show QR" saves it and carries on; "Take cash instead" switches the bill to cash.
 */
export function UpiSheet({ visible, onClose, onSaved, onCash }: { visible: boolean; onClose: () => void; onSaved: () => void; onCash: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const { updateProfile } = useStore();
  const [upi, setUpi] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!isValidUpi(upi) || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ upiId: normalizeUpi(upi) });
      setSaving(false);
      onSaved();
    } catch (e) {
      setError(errorText(t, e));
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('upi.sheetTitle')}>
      <View style={styles.body}>
        <T variant="supporting" color={colors.ink2}>
          {t('upi.sheetSub')}
        </T>
        {error ? <ErrorBanner message={error} onRetry={save} /> : null}
        <UpiField value={upi} onChangeText={setUpi} autoFocus />
        <Button label={saving ? t('common.saving') : t('upi.saveShowQr')} onPress={save} disabled={!isValidUpi(upi) || saving} />
        <Button label={t('upi.takeCash')} variant="secondary" onPress={onCash} disabled={saving} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3] },
});
