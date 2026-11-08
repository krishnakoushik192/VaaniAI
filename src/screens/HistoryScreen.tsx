import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { ErrorBanner } from '../components/Feedback';
import { EmptyState } from '../components/Form';
import { Icon } from '../components/Icon';
import { Card, Screen } from '../components/Layout';
import { TxnRow } from '../components/Rows';
import { Pills } from '../components/Segmented';
import { T } from '../components/Text';
import { Txn } from '../data/types';
import { errorText, useT } from '../i18n';
import { dayLabel } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';

type Filter = 'all' | 'bill' | 'payment' | 'khata';

export function HistoryScreen() {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, txns, customerById, refresh } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const { status, error } = state.sync;

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const walkIn = t('common.walkIn').toLowerCase();
    const list = txns
      .filter(x => filter === 'all' || (filter === 'khata' ? x.kind === 'bill' && x.method === 'khata' : x.kind === filter))
      .filter(x => {
        if (!needle) {
          return true;
        }
        const name = customerById(x.customerId)?.name.toLowerCase() ?? walkIn;
        return name.includes(needle) || (x.billNo ?? '').includes(needle) || String(x.amount / 100).includes(needle);
      });
    const out: { day: string; items: Txn[]; total: number }[] = [];
    for (const x of list) {
      const day = dayLabel(t, x.createdAt);
      let g = out.find(d => d.day === day);
      if (!g) {
        g = { day, items: [], total: 0 };
        out.push(g);
      }
      g.items.push(x);
      g.total += x.kind === 'bill' ? x.amount : 0;
    }
    return out;
  }, [txns, filter, q, customerById, t]);

  return (
    <Screen
      refreshing={status === 'loading'}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <T variant="screenTitle">{t('history.title')}</T>
          <T variant="supporting" color={colors.ink2}>
            {t('history.recentNote')}
          </T>
        </View>
      }
      bottomNav={<BottomNav active="history" onChange={router.setTab} />}>
      {status === 'error' ? <ErrorBanner message={errorText(t, error)} onRetry={refresh} /> : null}
      <View style={[styles.search, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
        <Icon name="search" size={20} color={colors.ink2} />
        <TextInput
          accessibilityLabel={t('history.search')}
          placeholder={t('history.search')}
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
          { key: 'all', label: t('history.all') },
          { key: 'bill', label: t('history.bills') },
          { key: 'payment', label: t('history.payments') },
          { key: 'khata', label: t('history.khata') },
        ]}
      />
      {groups.length === 0 ? (
        <Card padded={false}>
          <EmptyState
            icon="history"
            title={q ? t('history.nothingFound') : t('history.noEntries')}
            body={q ? t('history.tryAnother') : t('home.noBillsBody')}
            action={q ? undefined : t('home.voiceBill')}
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
                {t('history.sales', { amount: formatINR(g.total) })}
              </T>
            </View>
            <Card padded={false}>
              {g.items.map((x, i) => (
                <TxnRow
                  key={x.id}
                  t={x}
                  first={i === 0}
                  onPress={x.customerId ? () => router.push({ name: 'customer', id: x.customerId as string }) : undefined}
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
