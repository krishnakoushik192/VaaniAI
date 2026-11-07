import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { EmptyState } from '../components/Form';
import { Icon } from '../components/Icon';
import { Card, IconButton, Screen } from '../components/Layout';
import { CustomerRow } from '../components/Rows';
import { Pills } from '../components/Segmented';
import { T } from '../components/Text';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';

type Filter = 'all' | 'due' | 'settled';

export function KhataScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');

  const owing = state.customers.filter(c => customerStatus(c) !== 'settled');
  const totalDue = owing.reduce((s, c) => s + c.balance, 0);
  const overdue = state.customers.filter(c => customerStatus(c) === 'overdue').length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return state.customers
      .filter(c => {
        const st = customerStatus(c);
        return filter === 'all' || (filter === 'due' && st !== 'settled') || (filter === 'settled' && st === 'settled');
      })
      .filter(c => !needle || c.name.toLowerCase().includes(needle) || (c.phone ?? '').includes(needle))
      .sort((a, b) => b.balance - a.balance);
  }, [state.customers, filter, q]);

  return (
    <Screen
      header={
        <View style={styles.header}>
          {searching ? (
            <View style={[styles.search, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
              <Icon name="search" size={20} color={colors.ink2} />
              <TextInput
                autoFocus
                accessibilityLabel="Search customers"
                placeholder="Name or phone"
                placeholderTextColor={colors.ink2}
                value={q}
                onChangeText={setQ}
                style={[type.body, styles.flex, { color: colors.ink }]}
              />
              <IconButton
                icon="close"
                label="Close search"
                onPress={() => {
                  setQ('');
                  setSearching(false);
                }}
              />
            </View>
          ) : (
            <>
              <View style={styles.flex}>
                <T variant="screenTitle">Khata</T>
                <T variant="teTitle" color={colors.ink2}>
                  ఖాతా
                </T>
              </View>
              <IconButton icon="search" label="Search customers" onPress={() => setSearching(true)} />
              <IconButton icon="userPlus" label="Add customer" onPress={() => router.push({ name: 'addCustomer' })} />
            </>
          )}
        </View>
      }
      bottomNav={<BottomNav active="khata" onChange={router.setTab} />}>
      <Card style={{ gap: space[1] }}>
        <T variant="caption" color={colors.ink2}>
          TOTAL DUE · మొత్తం బాకీ
        </T>
        <T variant="displayAmount" color={colors.warningText}>
          {formatINR(totalDue)}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {owing.length} customers owe · {overdue} overdue
        </T>
      </Card>

      <Pills
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: `All ${state.customers.length}` },
          { key: 'due', label: 'Due' },
          { key: 'settled', label: 'Settled' },
        ]}
      />

      <Card padded={false}>
        {rows.map((c, i) => (
          <CustomerRow key={c.id} c={c} first={i === 0} onPress={() => router.push({ name: 'customer', id: c.id })} />
        ))}
        {rows.length === 0 ? (
          <EmptyState
            icon="khata"
            title={q ? 'No match' : 'No customers here'}
            te="ఎవరూ లేరు"
            body={q ? `Nobody called “${q}”.` : 'Add a customer to start their Khata.'}
            action="Add customer"
            onAction={() => router.push({ name: 'addCustomer' })}
          />
        ) : null}
      </Card>
      <Button label="Record payment" variant="secondary" icon="payment" onPress={() => router.push({ name: 'recordPayment' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: size.headerH + 8, paddingHorizontal: space[5], paddingTop: space[2], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  search: { flex: 1, minHeight: size.touchMin + 4, borderWidth: 2, borderRadius: radii.sm, paddingLeft: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
