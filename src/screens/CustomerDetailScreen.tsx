import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { EmptyState } from '../components/Form';
import { AppHeader, Card, IconButton, Screen } from '../components/Layout';
import { TxnRow } from '../components/Rows';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { useT } from '../i18n';
import { whenLabel } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, useStore } from '../store/AppStore';
import { space, useTheme } from '../theme';

export function CustomerDetailScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, txns: allTxns, customerById, newDraft, refresh } = useStore();
  const c = customerById(id);

  if (!c) {
    return (
      <Screen header={<AppHeader title={t('cust.title')} onBack={router.back} />} refreshing={state.sync.status === 'loading'} onRefresh={refresh}>
        <EmptyState icon="user" title={t('cust.notFound')} body={t('cust.notFoundBody')} />
      </Screen>
    );
  }

  const st = customerStatus(c);
  const txns = allTxns.filter(x => x.customerId === c.id);

  const call = () => {
    if (!c.phone) {
      Alert.alert(t('cust.noPhone'), t('cust.addNumberCall', { name: c.name }));
      return;
    }
    Linking.openURL(`tel:${c.phone}`).catch(() => Alert.alert(t('cust.callFailed')));
  };

  const remind = () => {
    if (!c.phone) {
      Alert.alert(t('cust.noPhone'), t('cust.addNumberRemind', { name: c.name }));
      return;
    }
    const upi = state.shop?.upiId;
    const msg = t('cust.reminder', {
      name: c.name,
      amount: formatINR(c.balance),
      shop: state.shop?.shopName ?? '',
      upi: upi ? t('cust.reminderUpi', { upi }) : '',
    });
    Alert.alert(t('cust.sendReminderQ'), msg, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('cust.sendWhatsapp'),
        onPress: () =>
          Linking.openURL(`whatsapp://send?phone=91${c.phone}&text=${encodeURIComponent(msg)}`).catch(() =>
            Alert.alert(t('cust.whatsappMissing'), t('cust.installWhatsapp')),
          ),
      },
    ]);
  };

  const addCredit = () => router.push({ name: 'editItems', draft: newDraft({ customerId: c.id, method: 'khata' }) });

  return (
    <Screen
      refreshing={state.sync.status === 'loading'}
      onRefresh={refresh}
      header={
        <AppHeader
          title={c.name}
          onBack={router.back}
          right={
            <View style={styles.right}>
              <IconButton icon="phone" label={t('cust.call', { name: c.name })} onPress={call} />
            </View>
          }
        />
      }
      footer={
        st === 'settled' ? (
          <Button label={t('cust.addCredit')} onPress={addCredit} />
        ) : (
          <>
            <Button label={t('cust.recordPayment')} onPress={() => router.push({ name: 'recordPayment', customerId: c.id })} />
            <View style={styles.row}>
              <Button label={t('cust.remind')} icon="send" variant="secondary" small style={styles.flex} onPress={remind} />
              <Button label={t('cust.addCredit')} icon="plus" variant="secondary" small style={styles.flex} onPress={addCredit} />
            </View>
          </>
        )
      }>
      <Card style={{ gap: space[1] }}>
        <T variant="caption" color={colors.ink2}>
          {st === 'settled' ? t('cust.balance') : t('cust.owesYou')}
        </T>
        <T variant="displayAmount" color={st === 'settled' ? colors.success : st === 'overdue' ? colors.danger : colors.warningText}>
          {formatINR(Math.max(0, c.balance))}
        </T>
        <View style={styles.meta}>
          <StatusChip kind={st} align="start" />
          <T variant="supporting" color={colors.ink2}>
            {c.dueSince && st !== 'settled'
              ? t('cust.since', { date: whenLabel(t, c.dueSince).split(',')[0] })
              : c.phone
              ? `+91 ${c.phone}`
              : t('common.noPhone')}
          </T>
        </View>
      </Card>

      <T variant="sectionTitle">{t('cust.recent')}</T>
      <Card padded={false}>
        {txns.length ? (
          txns.map((x, i) => <TxnRow key={x.id} t={x} first={i === 0} showDay />)
        ) : (
          <EmptyState icon="receipt" title={t('cust.noEntries')} body={t('cust.noEntriesBody')} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { paddingRight: space[2] },
  row: { flexDirection: 'row', gap: space[3] },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[1] },
});
