import React from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { EmptyState } from '../components/Form';
import { AppHeader, Card, IconButton, Screen } from '../components/Layout';
import { TxnRow } from '../components/Rows';
import { StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { whenLabel } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, useStore } from '../store/AppStore';
import { space, useTheme } from '../theme';

export function CustomerDetailScreen({ id }: { id: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, customerById, newDraft } = useStore();
  const c = customerById(id);

  if (!c) {
    return (
      <Screen header={<AppHeader title="Customer" onBack={router.back} />}>
        <EmptyState icon="user" title="Customer not found" body="They may have been removed." />
      </Screen>
    );
  }

  const st = customerStatus(c);
  const txns = state.txns.filter(t => t.customerId === c.id);

  const call = () => {
    if (!c.phone) {
      Alert.alert('No phone number', `Add ${c.name}’s number to call.`);
      return;
    }
    Linking.openURL(`tel:${c.phone}`).catch(() => Alert.alert('Could not start the call'));
  };

  const remind = () => {
    if (!c.phone) {
      Alert.alert('No phone number', `Add ${c.name}’s number to send a reminder.`);
      return;
    }
    const msg = `Namaskaram ${c.name} garu, ${state.profile.shopName} lo mee baaki ${formatINR(c.balance)}. UPI: ${state.profile.upiId}. Dhanyavaadalu.`;
    Alert.alert('Send reminder?', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send on WhatsApp',
        onPress: () =>
          Linking.openURL(`whatsapp://send?phone=91${c.phone}&text=${encodeURIComponent(msg)}`).catch(() =>
            Alert.alert('WhatsApp not found', 'Install WhatsApp to send reminders.'),
          ),
      },
    ]);
  };

  return (
    <Screen
      header={<AppHeader title={c.name} onBack={router.back} right={<View style={styles.right}><IconButton icon="phone" label={`Call ${c.name}`} onPress={call} /></View>} />}
      footer={
        st === 'settled' ? (
          <Button label="Add credit" te="అప్పు రాయండి" onPress={() => router.push({ name: 'editItems', draft: newDraft({ customerId: c.id, method: 'khata' }) })} />
        ) : (
          <>
            <Button label="Record payment" te="చెల్లింపు నమోదు" onPress={() => router.push({ name: 'recordPayment', customerId: c.id })} />
            <View style={styles.row}>
              <Button label="Remind" icon="send" variant="secondary" small style={styles.flex} onPress={remind} />
              <Button
                label="Add credit"
                icon="plus"
                variant="secondary"
                small
                style={styles.flex}
                onPress={() => router.push({ name: 'editItems', draft: newDraft({ customerId: c.id, method: 'khata' }) })}
              />
            </View>
          </>
        )
      }>
      <Card style={{ gap: space[1] }}>
        <T variant="caption" color={colors.ink2}>
          {st === 'settled' ? 'BALANCE' : 'OWES YOU · బాకీ'}
        </T>
        <T variant="displayAmount" color={st === 'settled' ? colors.success : st === 'overdue' ? colors.danger : colors.warningText}>
          {formatINR(Math.max(0, c.balance))}
        </T>
        <View style={styles.meta}>
          <StatusChip kind={st} align="start" />
          <T variant="supporting" color={colors.ink2}>
            {c.dueSince && st !== 'settled' ? `Since ${whenLabel(c.dueSince).split(',')[0]}` : c.phone ? `+91 ${c.phone}` : 'No phone'}
          </T>
        </View>
      </Card>

      <T variant="sectionTitle">Statement</T>
      <Card padded={false}>
        {txns.length ? (
          txns.map((t, i) => <TxnRow key={t.id} t={t} first={i === 0} showDay />)
        ) : (
          <EmptyState icon="receipt" title="No entries yet" body="Bills and payments for this customer show here." />
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
