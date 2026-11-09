import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { AppHeader, Card, Screen } from '../components/Layout';
import { QuestionSheet } from '../components/Sheet';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { errorText, useT } from '../i18n';
import { formatINR, upiUri } from '../logic/money';
import { mmss } from '../logic/dates';
import { BillDraft, PaymentMethod, useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const WINDOW = 180; // 3:00

type Phase = 'waiting' | 'asking' | 'notReceived';

export function PaymentQRScreen({ draft, total }: { draft: BillDraft; total: number }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, saveBill, customerById } = useStore();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [left, setLeft] = useState(WINDOW);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ text: string; retry: () => void } | null>(null);
  const customer = customerById(draft.customerId);
  const shop = state.shop;
  const upiId = shop?.upiId;

  useEffect(() => {
    if (phase !== 'waiting' || !upiId) {
      return;
    }
    const timer = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [phase, upiId]);

  useEffect(() => {
    if (left === 0 && phase === 'waiting') {
      setPhase('asking'); // asks by itself at 0:00
    }
  }, [left, phase]);

  const commit = async (method: PaymentMethod) => {
    if (saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBill(draft, method);
      router.resetTo({
        name: 'result',
        kind: method === 'khata' ? 'khata' : 'paid',
        amount: total,
        customerId: draft.customerId,
        method,
      });
    } catch (e) {
      setError({ text: errorText(t, e), retry: () => commit(method) });
      setSaving(false);
    }
  };

  const arrived = () => {
    setPhase('waiting');
    commit('upi');
  };
  const showAgain = () => {
    setLeft(WINDOW);
    setPhase('waiting');
  };

  return (
    <Screen
      header={<AppHeader title={t('pay.title')} onBack={router.back} />}
      footer={
        !upiId ? (
          <Button label={t('pay.addUpi')} onPress={() => router.push({ name: 'upi' })} />
        ) : phase === 'notReceived' ? (
          <>
            <Button label={t('pay.showAgain')} icon="qr" onPress={showAgain} disabled={saving} />
            <Button
              label={saving ? t('common.saving') : customer ? t('pay.addToKhata') : t('pay.addToKhataNeeds')}
              variant="secondary"
              onPress={() => commit('khata')}
              disabled={!customer || saving}
            />
          </>
        ) : (
          <Button label={saving ? t('common.saving') : t('pay.check')} onPress={() => setPhase('asking')} disabled={saving} />
        )
      }>
      {error ? <ErrorBanner message={error.text} onRetry={error.retry} /> : null}

      <Card style={styles.qrCard}>
        <View style={styles.center}>
          <T variant="supporting" color={colors.ink2}>
            {t('pay.pays', { name: customer?.name ?? t('pay.customer') })}
          </T>
          <T variant="displayAmount">{formatINR(total)}</T>
          <T variant="caption" color={colors.ink2}>
            {t('pay.onlineUpi')}
          </T>
        </View>

        {upiId && shop ? (
          <>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={t('pay.qrA11y', { amount: formatINR(total) })}
              style={[styles.qrBox, { backgroundColor: colors.qrGround, borderColor: colors.line, opacity: phase === 'notReceived' ? 0.3 : 1 }]}>
              <QRCode
                value={upiUri({ vpa: upiId, payee: shop.shopName, amount: total, note: `Bill ${draft.number}` })}
                size={200}
                color={colors.qrInk}
                backgroundColor={colors.qrGround}
              />
            </View>
            <T variant="bodyMedium">{upiId}</T>
            {phase === 'notReceived' ? (
              <StatusChip kind="failed" label={t('pay.notReceived')} align="center" />
            ) : (
              <StatusChip kind="pending" label={t('pay.waiting', { time: mmss(left) })} align="center" />
            )}
          </>
        ) : (
          <T variant="body" color={colors.warningText} style={styles.text}>
            {t('pay.noUpi')}
          </T>
        )}
      </Card>

      {phase !== 'notReceived' ? (
        <View style={styles.row}>
          <Button
            label={t('pay.paidCash')}
            variant="secondary"
            small
            style={styles.flex}
            disabled={saving}
            onPress={() => router.replace({ name: 'cashConfirm', draft, total })}
          />
          <Button label={t('pay.addToKhata')} variant="secondary" small style={styles.flex} onPress={() => commit('khata')} disabled={!customer || saving} />
        </View>
      ) : null}

      <QuestionSheet
        visible={phase === 'asking'}
        onClose={() => setPhase('waiting')}
        title={t('pay.arrivedQ', { amount: formatINR(total) })}
        body={t('pay.arrivedBody')}
        yes={t('pay.yes')}
        no={t('pay.no')}
        onYes={arrived}
        onNo={() => setPhase('notReceived')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  text: { textAlign: 'center' },
  qrCard: { alignItems: 'center', gap: space[4], paddingVertical: space[6], borderRadius: radii.lg },
  center: { alignItems: 'center', gap: 2 },
  qrBox: { padding: 14, borderWidth: 1, borderRadius: radii.md },
  row: { flexDirection: 'row', gap: space[3] },
});
