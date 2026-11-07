import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { StatusChip } from '../components/StatusChip';
import { Bi, T } from '../components/Text';
import { PaymentMethod } from '../data/sample';
import { formatINR } from '../logic/money';
import { ResultKind, useRouter } from '../navigation/Router';
import { methodLabel, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

/** Bill saved / Added to Khata / Payment recorded. No Back into the finished flow. */
export function ResultScreen({ kind, amount, customerId, method }: { kind: ResultKind; amount: number; customerId: string | null; method: PaymentMethod }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, customerById } = useStore();
  const customer = customerById(customerId);
  const name = customer?.name ?? 'Walk-in customer';
  // Never claim "Synced" before the server confirms (simulated here).
  const [sync, setSync] = useState<'syncing' | 'synced' | 'offline'>(state.settings.offline ? 'offline' : 'syncing');
  useEffect(() => {
    if (sync !== 'syncing') {
      return;
    }
    const t = setTimeout(() => setSync('synced'), 1200);
    return () => clearTimeout(t);
  }, [sync]);

  const khata = kind === 'khata';
  const title = kind === 'payment' ? 'Payment recorded' : khata ? 'Added to Khata' : 'Bill saved';
  const te = kind === 'payment' ? 'చెల్లింపు నమోదైంది' : khata ? 'ఖాతాలో చేర్చబడింది' : 'బిల్లు సేవ్ అయింది';
  const line = khata ? `${formatINR(amount)} added to ${name}’s Khata.` : `${formatINR(amount)} received from ${name}.`;

  return (
    <Screen
      footer={
        <>
          <Button
            label="Next customer"
            te="తదుపరి కస్టమర్"
            onPress={() => {
              router.reset('home');
              router.push({ name: 'recorder' });
            }}
          />
          {customer ? (
            <Button label={`Open ${customer.name}’s Khata`} variant="secondary" onPress={() => router.resetTo({ name: 'customer', id: customer.id })} />
          ) : (
            <Button label="Share receipt" variant="secondary" icon="send" onPress={() => Alert.alert('Receipt', 'Sharing is not connected in this demo.')} />
          )}
          <Button label="Home" variant="ghost" small onPress={() => router.reset('home')} />
        </>
      }>
      <View style={styles.center}>
        <View style={[styles.well, { backgroundColor: khata ? colors.warningSoft : colors.successSoft }]}>
          <Icon name={khata ? 'khata' : 'check'} size={40} color={khata ? colors.warning : colors.success} strokeWidth={2.4} />
        </View>
        <Bi en={title} te={te} variant="screenTitle" align="center" />
        <T variant="displayAmount" color={khata ? colors.warningText : colors.success}>
          {khata ? formatINR(amount) : formatINR(amount, { sign: true })}
        </T>
        <T variant="body" color={colors.ink2} style={styles.text}>
          {line}
        </T>
        <View style={styles.chips}>
          <StatusChip kind={khata ? 'due' : 'paid'} align="center" label={khata ? 'Due' : methodLabel(method)} />
          <StatusChip kind={sync} align="center" />
        </View>
        {customer && customer.balance > 0 ? (
          <T variant="supporting" color={colors.ink2}>
            {customer.name} now owes {formatINR(customer.balance)}
          </T>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space[3], paddingTop: space[10] },
  well: { width: 88, height: 88, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
  text: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: space[2] },
});
