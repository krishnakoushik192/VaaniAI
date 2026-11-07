import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/Form';
import { Icon } from '../components/Icon';
import { Card, Screen } from '../components/Layout';
import { TxnRow } from '../components/Rows';
import { Pills } from '../components/Segmented';
import { T } from '../components/Text';
import { Txn } from '../data/sample';
import { dayLabel } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';

type Filter = 'all' | 'bill' | 'payment' | 'khata';

export function HistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, customerById } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = state.txns
      .filter(t => filter === 'all' || (filter === 'khata' ? t.kind === 'bill' && t.method === 'khata' : t.kind === filter))
      .filter(t => {
        if (!needle) {
          return true;
        }
        const name = customerById(t.customerId)?.name ?? 'walk-in';
        return name.toLowerCase().includes(needle) || (t.billNo ?? '').includes(needle) || String(t.amount / 100).includes(needle);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    const out: { day: string; items: Txn[]; total: number }[] = [];
    for (const t of list) {
      const day = dayLabel(t.createdAt);
      let g = out.find(x => x.day === day);
      if (!g) {
        g = { day, items: [], total: 0 };
        out.push(g);
      }
      g.items.push(t);
      g.total += t.kind === 'bill' ? t.amount : 0;
    }
    return out;
  }, [state.txns, filter, q, customerById]);

  return (
    <Screen
      header={
        <View style={styles.header}>
          <T variant="screenTitle">History</T>
          <T variant="teTitle" color={colors.ink2}>
            చరిత్ర
          </T>
        </View>
      }
      bottomNav={<BottomNav active="history" onChange={router.setTab} />}>
      <View style={[styles.search, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
        <Icon name="search" size={20} color={colors.ink2} />
        <TextInput
          accessibilityLabel="Search bills and payments"
          placeholder="Search name, bill no. or amount"
          placeholderTextColor={colors.ink2}
          value={q}
          onChangeText={setQ}
          style={[type.body, styles.flex, { color: colors.ink }]}
        />
      </View>
      <Pills
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: 'All' },
          { key: 'bill', label: 'Bills' },
          { key: 'payment', label: 'Payments' },
          { key: 'khata', label: 'Khata' },
        ]}
      />
      {groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon="history"
            title={q ? 'Nothing found' : 'No entries yet'}
            te="ఏమీ లేదు"
            body={q ? 'Try another name or amount.' : 'Make your first voice bill.'}
            action={q ? undefined : 'Create bill with voice'}
            onAction={() => router.push({ name: 'recorder' })}
          />
        </Card>
      ) : (
        groups.map(g => (
          <View key={g.day} style={{ gap: space[2] }}>
            <View style={styles.dayRow}>
              <T variant="caption" color={colors.ink2}>
                {g.day.toUpperCase()}
              </T>
              <T variant="caption" color={colors.ink2}>
                SALES {formatINR(g.total)}
              </T>
            </View>
            <Card padded={false}>
              {g.items.map((t, i) => (
                <TxnRow
                  key={t.id}
                  t={t}
                  first={i === 0}
                  onPress={t.customerId ? () => router.push({ name: 'customer', id: t.customerId as string }) : undefined}
                />
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: space[5], paddingTop: space[2], gap: 2 },
  search: { minHeight: size.touchMin + 4, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
