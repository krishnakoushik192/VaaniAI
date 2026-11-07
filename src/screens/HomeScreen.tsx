import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/Form';
import { Icon, IconName } from '../components/Icon';
import { Card, Screen } from '../components/Layout';
import { LogoMark } from '../components/Logo';
import { TxnRow } from '../components/Rows';
import { StatusChip } from '../components/StatusChip';
import { Bi, T } from '../components/Text';
import { shortDate } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, initials, todaySummary, useStore } from '../store/AppStore';
import { radii, size, space, useTheme } from '../theme';

export function HomeScreen() {
  const { colors, shadows, isDark } = useTheme();
  const router = useRouter();
  const { state, newDraft } = useStore();
  const { profile } = state;
  const today = todaySummary(state.txns);
  const owing = state.customers.filter(c => customerStatus(c) !== 'settled');
  const owed = owing.reduce((s, c) => s + c.balance, 0);

  const quick: { en: string; te: string; icon: IconName; tint: string; well: string; onPress: () => void }[] = [
    {
      en: 'Manual bill',
      te: 'చేతితో బిల్లు',
      icon: 'receipt',
      tint: colors.primary,
      well: colors.primarySoft,
      onPress: () => router.push({ name: 'editItems', draft: newDraft() }),
    },
    { en: 'Add customer', te: 'కస్టమర్ జోడించు', icon: 'userPlus', tint: colors.primary, well: colors.primarySoft, onPress: () => router.push({ name: 'addCustomer' }) },
    { en: 'Record payment', te: 'చెల్లింపు నమోదు', icon: 'payment', tint: colors.success, well: colors.successSoft, onPress: () => router.push({ name: 'recordPayment' }) },
    { en: 'Khata', te: 'ఖాతా', icon: 'khata', tint: colors.warning, well: colors.warningSoft, onPress: () => router.setTab('khata') },
  ];

  return (
    <Screen
      header={
        <View style={styles.header}>
          <LogoMark size={40} ground={isDark ? 'dark' : 'light'} />
          <View style={styles.flex}>
            <T variant="sectionTitle" numberOfLines={1} style={{ fontWeight: '700' }}>
              {profile.shopName}
            </T>
            <StatusChip kind={state.settings.offline ? 'offline' : 'synced'} align="start" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            onPress={() => router.push({ name: 'settings' })}
            style={({ pressed }) => [styles.avatar, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <T variant="button">{initials(profile.ownerName)}</T>
          </Pressable>
        </View>
      }
      bottomNav={<BottomNav active="home" onChange={router.setTab} />}>
      <T variant="supporting" color={colors.ink2} style={styles.greet}>
        Namaskaram, {profile.ownerName.split(' ')[0]} garu
      </T>

      <Card style={{ gap: space[4] }}>
        <View style={{ gap: 2 }}>
          <T variant="caption" color={colors.ink2}>
            TODAY'S SALES
          </T>
          <T variant="displayAmount">{formatINR(today.sales)}</T>
          <T variant="supporting" color={colors.ink2}>
            {today.bills} {today.bills === 1 ? 'bill' : 'bills'} · {shortDate(Date.now())}
          </T>
        </View>
        <View style={styles.grid2}>
          <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
            <T variant="supporting" color={colors.ink2}>
              Received
            </T>
            <T variant="sectionTitle" color={colors.success} style={styles.amount}>
              {formatINR(today.received)}
            </T>
          </View>
          <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
            <T variant="supporting" color={colors.ink2}>
              Due · బాకీ
            </T>
            <T variant="sectionTitle" color={colors.warningText} style={styles.amount}>
              {formatINR(today.due)}
            </T>
          </View>
        </View>
      </Card>

      {/* The one blue hero on Home. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create bill with voice"
        onPress={() => router.push({ name: 'recorder' })}
        style={({ pressed }) => [
          styles.hero,
          shadows.fab,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}>
        <View style={styles.heroMic}>
          <Icon name="mic" size={24} color={colors.onPrimary} />
        </View>
        <Bi en="Create bill with voice" te="వాయిస్‌తో బిల్లు చేయండి" variant="button" color={colors.onPrimary} teColor={colors.primarySoft} style={styles.flex} />
        <Icon name="chevronRight" size={20} color={colors.onPrimary} />
      </Pressable>

      <View style={styles.quickGrid}>
        {quick.map(q => (
          <Pressable
            key={q.en}
            accessibilityRole="button"
            accessibilityLabel={q.en}
            onPress={q.onPress}
            style={({ pressed }) => [styles.quick, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <View style={[styles.quickWell, { backgroundColor: q.well }]}>
              <Icon name={q.icon} size={20} color={q.tint} />
            </View>
            <Bi en={q.en} te={q.te} style={styles.flex} />
          </Pressable>
        ))}
      </View>

      {owing.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.setTab('khata')}
          style={({ pressed }) => [styles.nudge, { backgroundColor: pressed ? colors.surfaceMuted : colors.warningSoft }]}>
          <Icon name="khata" size={20} color={colors.warning} />
          <T variant="bodyMedium" color={colors.warningText} style={styles.flex}>
            {owing.length} customers owe {formatINR(owed)}
          </T>
          <T variant="bodyMedium" color={colors.primary}>
            Open Khata
          </T>
        </Pressable>
      ) : null}

      <View style={{ gap: space[2] }}>
        <View style={styles.between}>
          <T variant="sectionTitle">Recent activity</T>
          <Pressable accessibilityRole="link" onPress={() => router.setTab('history')} hitSlop={12}>
            <T variant="bodyMedium" color={colors.primary}>
              See all
            </T>
          </Pressable>
        </View>
        <Card padded={false}>
          {state.txns.length === 0 ? (
            <EmptyState icon="receipt" title="No bills yet" te="ఇంకా బిల్లులు లేవు" body="Make your first voice bill." />
          ) : (
            state.txns.slice(0, 4).map((t, i) => (
              <TxnRow key={t.id} t={t} first={i === 0} showDay onPress={t.customerId ? () => router.push({ name: 'customer', id: t.customerId as string }) : undefined} />
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { height: size.headerH + 8, paddingHorizontal: space[5], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  avatar: { width: size.touchMin, height: size.touchMin, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  greet: { marginBottom: -space[3] },
  grid2: { flexDirection: 'row', gap: space[3] },
  well: { flex: 1, borderRadius: radii.sm, padding: space[3], gap: 2 },
  amount: { fontVariant: ['tabular-nums'], fontWeight: '700' },
  hero: { minHeight: 72, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', gap: space[4], paddingHorizontal: space[5], paddingVertical: space[3] },
  heroMic: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  quick: { flexBasis: '47%', flexGrow: 1, minHeight: 76, borderWidth: 1, borderRadius: radii.md, padding: space[3], flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickWell: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  nudge: { minHeight: 52, borderRadius: radii.md, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
