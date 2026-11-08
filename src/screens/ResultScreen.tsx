import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { PaymentMethod } from '../data/types';
import { useT } from '../i18n';
import { formatINR } from '../logic/money';
import { ResultKind, useRouter } from '../navigation/Router';
import { methodLabel, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

/** Bill saved / Added to Khata / Payment recorded. Only shown after the server confirmed the save. */
export function ResultScreen({ kind, amount, customerId, method }: { kind: ResultKind; amount: number; customerId: string | null; method: PaymentMethod }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { customerById } = useStore();
  const customer = customerById(customerId);
  const name = customer?.name ?? t('common.walkIn');

  const khata = kind === 'khata';
  const title = kind === 'payment' ? t('result.paymentRecorded') : khata ? t('result.addedKhata') : t('result.billSaved');
  const line = khata ? t('result.addedLine', { amount: formatINR(amount), name }) : t('result.receivedLine', { amount: formatINR(amount), name });

  return (
    <Screen
      footer={
        <>
          <Button
            label={t('result.next')}
            onPress={() => {
              router.reset('home');
              router.push({ name: 'recorder' });
            }}
          />
          {customer ? (
            <Button label={t('result.openKhata', { name: customer.name })} variant="secondary" onPress={() => router.resetTo({ name: 'customer', id: customer.id })} />
          ) : (
            <Button label={t('result.share')} variant="secondary" icon="send" onPress={() => Alert.alert(t('result.share'), t('result.shareSoon'))} />
          )}
          <Button label={t('common.home')} variant="ghost" small onPress={() => router.reset('home')} />
        </>
      }>
      <View style={styles.center}>
        <View style={[styles.well, { backgroundColor: khata ? colors.warningSoft : colors.successSoft }]}>
          <Icon name={khata ? 'khata' : 'check'} size={40} color={khata ? colors.warning : colors.success} strokeWidth={2.4} />
        </View>
        <T variant="screenTitle" style={styles.text}>
          {title}
        </T>
        <T variant="displayAmount" color={khata ? colors.warningText : colors.success}>
          {khata ? formatINR(amount) : formatINR(amount, { sign: true })}
        </T>
        <T variant="body" color={colors.ink2} style={styles.text}>
          {line}
        </T>
        <View style={styles.chips}>
          <StatusChip kind={khata ? 'due' : 'paid'} align="center" label={khata ? undefined : methodLabel(t, method)} />
          <StatusChip kind="synced" align="center" />
        </View>
        {customer && customer.balance > 0 ? (
          <T variant="supporting" color={colors.ink2}>
            {t('result.nowOwes', { name: customer.name, amount: formatINR(customer.balance) })}
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
