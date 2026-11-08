import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { TextField } from '../components/Form';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { CustomerSheet, FingerprintSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { errorText, useT } from '../i18n';
import { clientId, formatINR, rupees } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

export function RecordPaymentScreen({ customerId: initialId }: { customerId?: string }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, customerById, recordPayment } = useStore();
  const [customerId, setCustomerId] = useState<string | null>(initialId ?? null);
  const c = customerById(customerId);
  const [amount, setAmount] = useState(c && c.balance > 0 ? String(c.balance / 100) : '');
  const [method, setMethod] = useState<'cash' | 'upi'>('cash');
  const [pickOpen, setPickOpen] = useState(!initialId);
  const [fp, setFp] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payId] = useState(() => clientId('pay')); // same id on retry → recorded once

  const value = parseFloat(amount);
  const paise = Number.isFinite(value) ? rupees(value) : 0;
  const fieldError = !c
    ? t('rp.errChoose')
    : c.balance <= 0
    ? t('rp.errNothingDue')
    : !(paise > 0)
    ? t('rp.errAmount')
    : paise > c.balance
    ? t('rp.errTooMuch', { amount: formatINR(c.balance) })
    : undefined;

  const commit = async () => {
    if (!c || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordPayment(c.id, paise, method, payId);
      router.resetTo({ name: 'result', kind: 'payment', amount: paise, customerId: c.id, method });
    } catch (e) {
      setError(errorText(t, e, { 400: 'err.payTooMuch' }));
      setSaving(false);
    }
  };
  const save = () => {
    setTried(true);
    if (fieldError) {
      return;
    }
    if (state.settings.fingerprint) {
      setFp(true);
    } else {
      commit();
    }
  };

  return (
    <View style={styles.flex}>
      <Screen
        header={<AppHeader title={t('rp.title')} onBack={router.back} />}
        footer={
          <Button
            label={saving ? t('common.saving') : paise > 0 ? t('rp.saveAmount', { amount: formatINR(paise) }) : t('rp.save')}
            onPress={save}
            disabled={saving}
          />
        }>
        {error ? <ErrorBanner message={error} onRetry={commit} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c ? t('review.customerA11y', { name: c.name }) : t('rp.choose')}
          onPress={() => setPickOpen(true)}
          style={[styles.customer, { borderColor: tried && !c ? colors.danger : colors.line, backgroundColor: colors.surface }]}>
          <View style={[styles.initial, { backgroundColor: colors.primarySoft }]}>
            {c ? (
              <T variant="button" color={colors.primary}>
                {initials(c.name)}
              </T>
            ) : (
              <Icon name="user" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.flex}>
            <T variant="bodyMedium">{c?.name ?? t('rp.choose')}</T>
            {c ? (
              <T variant="supporting" color={c.balance > 0 ? colors.warningText : colors.ink2}>
                {c.balance > 0 ? t('rp.owes', { amount: formatINR(c.balance) }) : t('rp.nothingDue')}
              </T>
            ) : null}
          </View>
          <T variant="bodyMedium" color={colors.primary}>
            {c ? t('common.change') : t('common.choose')}
          </T>
        </Pressable>
        {tried && !c ? (
          <T variant="supporting" color={colors.danger}>
            {t('rp.errChoose')}
          </T>
        ) : null}

        <TextField
          label={t('rp.amount')}
          prefix="₹"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          error={tried && c ? fieldError : undefined}
        />

        {c && c.balance > 0 ? (
          <View style={styles.chips}>
            {[c.balance, Math.round(c.balance / 2)].map(v => (
              <Pressable
                key={v}
                accessibilityRole="button"
                onPress={() => setAmount(String(v / 100))}
                style={[styles.chip, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
                <T variant="bodyMedium">{v === c.balance ? t('rp.full', { amount: formatINR(v) }) : t('rp.half', { amount: formatINR(v) })}</T>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ gap: space[2] }}>
          <T variant="caption" color={colors.ink2}>
            {t('rp.paidBy')}
          </T>
          <Segmented
            label={t('rp.paidBy')}
            value={method}
            onChange={setMethod}
            options={[
              { key: 'cash', label: t('method.cash') },
              { key: 'upi', label: t('method.upiLong') },
            ]}
          />
        </View>
      </Screen>
      <CustomerSheet
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={id => {
          setCustomerId(id);
          const picked = customerById(id);
          setAmount(picked && picked.balance > 0 ? String(picked.balance / 100) : '');
        }}
      />
      <FingerprintSheet
        visible={fp}
        onClose={() => setFp(false)}
        amountLabel={formatINR(paise)}
        onDone={() => {
          setFp(false);
          commit();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  customer: { minHeight: 64, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginTop: -space[2] },
  chip: { minHeight: 44, paddingHorizontal: space[4], borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
});
