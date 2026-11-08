import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { EmptyState } from '../components/Form';
import { Icon } from '../components/Icon';
import { Card, IconButton, Screen } from '../components/Layout';
import { CustomerRow } from '../components/Rows';
import { Pills } from '../components/Segmented';
import { T } from '../components/Text';
import { errorText, useT } from '../i18n';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';

type Filter = 'all' | 'due' | 'settled';

export function KhataScreen() {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, customers, refresh } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const { status, error } = state.sync;

  const owing = customers.filter(c => customerStatus(c) !== 'settled');
  const totalDue = state.shop?.duesTotal ?? owing.reduce((s, c) => s + c.balance, 0);
  const overdue = customers.filter(c => customerStatus(c) === 'overdue').length;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers
      .filter(c => {
        const st = customerStatus(c);
        return filter === 'all' || (filter === 'due' && st !== 'settled') || (filter === 'settled' && st === 'settled');
      })
      .filter(c => !needle || c.name.toLowerCase().includes(needle) || (c.phone ?? '').includes(needle))
      .sort((a, b) => b.balance - a.balance);
  }, [customers, filter, q]);

  return (
    <Screen
      refreshing={status === 'loading'}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          {searching ? (
            <View style={[styles.search, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
              <Icon name="search" size={20} color={colors.ink2} />
              <TextInput
                autoFocus
                accessibilityLabel={t('khata.searchA11y')}
                placeholder={t('khata.searchPlaceholder')}
                placeholderTextColor={colors.ink2}
                value={q}
                onChangeText={setQ}
                style={[type.body, styles.flex, { color: colors.ink }]}
              />
              <IconButton
                icon="close"
                label={t('khata.closeSearch')}
                onPress={() => {
                  setQ('');
                  setSearching(false);
                }}
              />
            </View>
          ) : (
            <>
              <T variant="screenTitle" style={styles.flex}>
                {t('khata.title')}
              </T>
              <IconButton icon="search" label={t('khata.searchA11y')} onPress={() => setSearching(true)} />
              <IconButton icon="userPlus" label={t('khata.addCustomer')} onPress={() => router.push({ name: 'addCustomer' })} />
            </>
          )}
        </View>
      }
      bottomNav={<BottomNav active="khata" onChange={router.setTab} />}>
      {status === 'error' ? <ErrorBanner message={errorText(t, error)} onRetry={refresh} /> : null}

      <Card style={{ gap: space[1] }}>
        <T variant="caption" color={colors.ink2}>
          {t('khata.totalDue')}
        </T>
        <T variant="displayAmount" color={colors.warningText}>
          {formatINR(totalDue)}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {t('khata.summary', { count: owing.length, overdue })}
        </T>
      </Card>

      <Pills
        value={filter}
        onChange={setFilter}
        options={[
          { key: 'all', label: t('khata.all', { count: customers.length }) },
          { key: 'due', label: t('khata.due') },
          { key: 'settled', label: t('khata.settled') },
        ]}
      />

      <Card padded={false}>
        {rows.map((c, i) => (
          <CustomerRow key={c.id} c={c} first={i === 0} onPress={() => router.push({ name: 'customer', id: c.id })} />
        ))}
        {rows.length === 0 ? (
          <EmptyState
            icon="khata"
            title={q ? t('khata.noMatch') : t('khata.noCustomers')}
            body={q ? t('khata.nobodyCalled', { q }) : t('khata.addToStart')}
            action={t('khata.addCustomer')}
            onAction={() => router.push({ name: 'addCustomer' })}
          />
        ) : null}
      </Card>
      <Button label={t('khata.recordPayment')} variant="secondary" icon="payment" onPress={() => router.push({ name: 'recordPayment' })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { minHeight: size.headerH + 8, paddingHorizontal: space[5], paddingTop: space[2], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  search: { flex: 1, minHeight: size.touchMin + 4, borderWidth: 2, borderRadius: radii.sm, paddingLeft: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
