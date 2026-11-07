import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../components/Button';
import { AppHeader, Card, Screen } from '../components/Layout';
import { FingerprintSheet, QuestionSheet } from '../components/Sheet';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { formatINR, upiUri } from '../logic/money';
import { mmss } from '../logic/useVoiceRecorder';
import { BillDraft, useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const WINDOW = 180; // 3:00

type Phase = 'waiting' | 'asking' | 'notReceived';

export function PaymentQRScreen({ draft, total }: { draft: BillDraft; total: number }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, saveBill, customerById } = useStore();
  const [phase, setPhase] = useState<Phase>('waiting');
  const [left, setLeft] = useState(WINDOW);
  const [fp, setFp] = useState(false);
  const customer = customerById(draft.customerId);
  const { profile } = state;

  useEffect(() => {
    if (phase !== 'waiting') {
      return;
    }
    const t = setInterval(() => setLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (left === 0 && phase === 'waiting') {
      setPhase('asking'); // asks by itself at 0:00
    }
  }, [left, phase]);

  const finish = (method: 'upi' | 'cash') => {
    saveBill(draft, method);
    router.resetTo({ name: 'result', kind: 'paid', amount: total, customerId: draft.customerId, method });
  };
  const toKhata = () => {
    saveBill(draft, 'khata');
    router.resetTo({ name: 'result', kind: 'khata', amount: total, customerId: draft.customerId, method: 'khata' });
  };
  const arrived = () => {
    setPhase('waiting');
    if (state.settings.fingerprint) {
      setFp(true);
    } else {
      finish('upi');
    }
  };
  const showAgain = () => {
    setLeft(WINDOW);
    setPhase('waiting');
  };

  return (
    <Screen
      header={<AppHeader title="Collect payment" te="డబ్బు తీసుకోండి" onBack={router.back} />}
      footer={
        phase === 'notReceived' ? (
          <>
            <Button label="Show QR again" icon="qr" onPress={showAgain} />
            <Button label={customer ? 'Add to Khata' : 'Add to Khata (needs customer)'} variant="secondary" onPress={toKhata} disabled={!customer} />
          </>
        ) : (
          <Button label="Check payment" te="చెల్లింపు చూడండి" onPress={() => setPhase('asking')} />
        )
      }>
      <Card style={styles.qrCard}>
        <View style={styles.center}>
          <T variant="supporting" color={colors.ink2}>
            {customer?.name ?? 'Customer'} pays
          </T>
          <T variant="displayAmount">{formatINR(total)}</T>
          <T variant="caption" color={colors.ink2}>
            ONLINE · UPI
          </T>
        </View>

        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`UPI QR code for ${formatINR(total)}`}
          style={[styles.qrBox, { backgroundColor: colors.qrGround, borderColor: colors.line, opacity: phase === 'notReceived' ? 0.3 : 1 }]}>
          <QRCode
            value={upiUri({ vpa: profile.upiId, payee: profile.shopName, amount: total, note: `Bill ${draft.number}` })}
            size={200}
            color={colors.qrInk}
            backgroundColor={colors.qrGround}
          />
        </View>

        <T variant="bodyMedium">{profile.upiId}</T>
        {phase === 'notReceived' ? (
          <StatusChip kind="failed" label="Not received" align="center" />
        ) : (
          <StatusChip kind="pending" label={`Waiting · ${mmss(left)}`} align="center" />
        )}
      </Card>

      {phase !== 'notReceived' ? (
        <View style={styles.row}>
          <Button label="Paid in cash" variant="secondary" small style={styles.flex} onPress={() => router.replace({ name: 'cashConfirm', draft, total })} />
          <Button label="Add to Khata" variant="secondary" small style={styles.flex} onPress={toKhata} disabled={!customer} />
        </View>
      ) : null}

      <QuestionSheet
        visible={phase === 'asking'}
        onClose={() => setPhase('waiting')}
        title={`Did ${formatINR(total)} arrive in your UPI app?`}
        te="మీ UPI యాప్‌లో డబ్బు వచ్చిందా?"
        body="Check your UPI app or the sound box before you confirm."
        yes="Yes, it arrived"
        yesTe="అవును, వచ్చింది"
        no="No, not yet"
        onYes={arrived}
        onNo={() => setPhase('notReceived')}
      />
      <FingerprintSheet
        visible={fp}
        onClose={() => setFp(false)}
        amountLabel={`${formatINR(total)} received`}
        onDone={() => {
          setFp(false);
          finish('upi');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  qrCard: { alignItems: 'center', gap: space[4], paddingVertical: space[6], borderRadius: radii.lg },
  center: { alignItems: 'center', gap: 2 },
  qrBox: { padding: 14, borderWidth: 1, borderRadius: radii.md },
  row: { flexDirection: 'row', gap: space[3] },
});
