import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Customer, Txn } from '../data/types';
import { useT } from '../i18n';
import { timeLabel, whenLabel } from '../logic/dates';
import { formatINR } from '../logic/money';
import { customerStatus, initials, methodLabel, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';
import { StatusChip } from './StatusChip';
import { T } from './Text';

export function TxnRow({ t: txn, first, showDay, onPress }: { t: Txn; first?: boolean; showDay?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const { customerById } = useStore();
  const name = customerById(txn.customerId)?.name ?? t('common.walkIn');
  const when = showDay ? whenLabel(t, txn.createdAt) : timeLabel(txn.createdAt);
  const isPayment = txn.kind === 'payment';
  const sub = isPayment
    ? `${t('row.payment')} · ${when} · ${methodLabel(t, txn.method)}`
    : `${t('row.bill', { no: txn.billNo ?? '' })} · ${when}${txn.method !== 'khata' ? ` · ${methodLabel(t, txn.method)}` : ''}`;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !first && { borderTopWidth: 1, borderTopColor: colors.line }, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.flex}>
        <T variant="bodyMedium" numberOfLines={1}>
          {name}
        </T>
        <T variant="supporting" color={colors.ink2} numberOfLines={1}>
          {sub}
        </T>
      </View>
      <View style={styles.trailing}>
        <T variant="button" color={isPayment ? colors.success : colors.ink} style={styles.num}>
          {isPayment ? formatINR(txn.amount, { sign: true }) : formatINR(txn.amount)}
        </T>
        {isPayment ? <StatusChip kind="paid" label={t('status.received')} /> : <StatusChip kind={txn.method === 'khata' ? 'due' : 'paid'} />}
      </View>
    </Pressable>
  );
}

export function CustomerRow({ c, first, onPress }: { c: Customer; first?: boolean; onPress?: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const { txns } = useStore();
  const st = customerStatus(c);
  const last = txns.find(x => x.customerId === c.id);
  const sub =
    st === 'settled'
      ? last
        ? t('row.last', { when: whenLabel(t, last.createdAt) })
        : t('row.noBills')
      : c.dueSince
      ? t('row.dueSince', { date: whenLabel(t, c.dueSince).split(',')[0] })
      : t('row.due');
  const amtColor = st === 'settled' ? colors.success : st === 'overdue' ? colors.danger : colors.warningText;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${st === 'settled' ? t('status.settled') : `${formatINR(c.balance)} ${t(st === 'overdue' ? 'status.overdue' : 'status.due')}`}`}
      style={({ pressed }) => [styles.row, styles.tall, !first && { borderTopWidth: 1, borderTopColor: colors.line }, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.initial, { backgroundColor: colors.surfaceMuted }]}>
        <T variant="button">{initials(c.name)}</T>
      </View>
      <View style={[styles.flex, styles.minW0]}>
        <T variant="bodyMedium" numberOfLines={1}>
          {c.name}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {sub}
        </T>
      </View>
      <View style={styles.trailing}>
        <T variant="button" color={amtColor} style={styles.num}>
          {formatINR(Math.max(0, c.balance))}
        </T>
        <StatusChip kind={st} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  minW0: { minWidth: 0 },
  num: { fontVariant: ['tabular-nums'] },
  row: { minHeight: 56, paddingHorizontal: space[4], paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  tall: { minHeight: 64 },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', gap: 2 },
});
