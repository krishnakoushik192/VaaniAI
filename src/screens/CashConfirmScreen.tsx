import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { FingerprintSheet } from '../components/Sheet';
import { Bi, T } from '../components/Text';
import { formatINR } from '../logic/money';
import { BillDraft, useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

/** "Did you get ₹490 in cash?" — Yes (primary) / No, add to Khata (secondary). */
export function CashConfirmScreen({ draft, total }: { draft: BillDraft; total: number }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, saveBill, customerById } = useStore();
  const [fp, setFp] = useState(false);
  const customer = customerById(draft.customerId);

  const markPaid = () => {
    saveBill(draft, 'cash');
    router.resetTo({ name: 'result', kind: 'paid', amount: total, customerId: draft.customerId, method: 'cash' });
  };
  const toKhata = () => {
    saveBill(draft, 'khata');
    router.resetTo({ name: 'result', kind: 'khata', amount: total, customerId: draft.customerId, method: 'khata' });
  };

  return (
    <Screen
      header={<AppHeader title="Cash payment" onBack={router.back} />}
      footer={
        <>
          <Button label="Yes, received" te="అవును, అందింది" onPress={() => (state.settings.fingerprint ? setFp(true) : markPaid())} />
          <Button
            label={customer ? 'No, add to Khata' : 'No, add to Khata (choose customer first)'}
            variant="secondary"
            onPress={toKhata}
            disabled={!customer}
          />
        </>
      }>
      <View style={styles.center}>
        <View style={[styles.well, { backgroundColor: colors.successSoft }]}>
          <Icon name="payment" size={36} color={colors.success} />
        </View>
        <Bi en={`Did you get ${formatINR(total)} in cash?`} te="నగదు అందిందా?" variant="screenTitle" align="center" />
        <T variant="displayAmount">{formatINR(total)}</T>
        <T variant="supporting" color={colors.ink2}>
          {customer?.name ?? 'Walk-in customer'} · Bill {draft.number}
        </T>
      </View>
      <FingerprintSheet
        visible={fp}
        onClose={() => setFp(false)}
        amountLabel={`${formatINR(total)} received`}
        onDone={() => {
          setFp(false);
          markPaid();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space[3], paddingTop: space[10] },
  well: { width: 80, height: 80, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
});
