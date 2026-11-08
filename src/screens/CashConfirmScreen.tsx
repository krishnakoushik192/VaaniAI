import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { FingerprintSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { errorText, useT } from '../i18n';
import { formatINR } from '../logic/money';
import { BillDraft, useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

/** "Did you get ₹490 in cash?" — Yes (primary) / No, add to Khata (secondary). */
export function CashConfirmScreen({ draft, total }: { draft: BillDraft; total: number }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, saveBill, customerById } = useStore();
  const [fp, setFp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; retry: () => void } | null>(null);
  const customer = customerById(draft.customerId);

  const commit = async (method: 'cash' | 'khata') => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBill(draft, method);
      router.resetTo({ name: 'result', kind: method === 'khata' ? 'khata' : 'paid', amount: total, customerId: draft.customerId, method });
    } catch (e) {
      setError({ text: errorText(t, e), retry: () => commit(method) });
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<AppHeader title={t('cash.title')} onBack={router.back} />}
      footer={
        <>
          <Button
            label={saving ? t('common.saving') : t('cash.yes')}
            disabled={saving}
            onPress={() => (state.settings.fingerprint ? setFp(true) : commit('cash'))}
          />
          <Button
            label={customer ? t('cash.noKhata') : t('cash.noKhataNeeds')}
            variant="secondary"
            onPress={() => commit('khata')}
            disabled={!customer || saving}
          />
        </>
      }>
      {error ? <ErrorBanner message={error.text} onRetry={error.retry} /> : null}
      <View style={styles.center}>
        <View style={[styles.well, { backgroundColor: colors.successSoft }]}>
          <Icon name="payment" size={36} color={colors.success} />
        </View>
        <T variant="screenTitle" style={styles.text}>
          {t('cash.question', { amount: formatINR(total) })}
        </T>
        <T variant="displayAmount">{formatINR(total)}</T>
        <T variant="supporting" color={colors.ink2}>
          {t('cash.line', { name: customer?.name ?? t('common.walkIn'), no: draft.number })}
        </T>
      </View>
      <FingerprintSheet
        visible={fp}
        onClose={() => setFp(false)}
        amountLabel={formatINR(total)}
        onDone={() => {
          setFp(false);
          commit('cash');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { textAlign: 'center' },
  center: { alignItems: 'center', gap: space[3], paddingTop: space[10] },
  well: { width: 80, height: 80, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
});
