import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BottomNav } from '../components/BottomNav';
import { ErrorBanner } from '../components/Feedback';
import { EmptyState } from '../components/Form';
import { Icon, IconName } from '../components/Icon';
import { Card, Screen } from '../components/Layout';
import { LogoMark } from '../components/Logo';
import { TxnRow } from '../components/Rows';
import { ChipKind, StatusChip } from '../components/StatusChip';
import { T } from '../components/Text';
import { errorText, StringKey, useT } from '../i18n';
import { shortDate } from '../logic/dates';
import { formatINR } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { customerStatus, initials, useStore } from '../store/AppStore';
import { radii, size, space, useTheme } from '../theme';

export function HomeScreen() {
  const { colors, shadows, isDark } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, customers, txns, refresh, newDraft } = useStore();
  const shop = state.shop;
  const owing = customers.filter(c => customerStatus(c) !== 'settled');
  const owed = owing.reduce((s, c) => s + c.balance, 0);
  const { status, error } = state.sync;
  const chip: ChipKind = status === 'loading' ? 'syncing' : status === 'error' ? (error?.kind === 'network' ? 'offline' : 'failed') : 'synced';

  const quick: { label: StringKey; icon: IconName; tint: string; well: string; onPress: () => void }[] = [
    { label: 'home.manualBill', icon: 'receipt', tint: colors.primary, well: colors.primarySoft, onPress: () => router.push({ name: 'editItems', draft: newDraft() }) },
    { label: 'home.addCustomer', icon: 'userPlus', tint: colors.primary, well: colors.primarySoft, onPress: () => router.push({ name: 'addCustomer' }) },
    { label: 'home.recordPayment', icon: 'payment', tint: colors.success, well: colors.successSoft, onPress: () => router.push({ name: 'recordPayment' }) },
    { label: 'home.khata', icon: 'khata', tint: colors.warning, well: colors.warningSoft, onPress: () => router.setTab('khata') },
  ];

  return (
    <Screen
      refreshing={status === 'loading'}
      onRefresh={refresh}
      header={
        <View style={styles.header}>
          <LogoMark size={40} ground={isDark ? 'dark' : 'light'} />
          <View style={styles.flex}>
            <T variant="sectionTitle" numberOfLines={1} style={styles.bold}>
              {shop?.shopName ?? ''}
            </T>
            <StatusChip kind={chip} align="start" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.profileA11y')}
            onPress={() => router.push({ name: 'settings' })}
            style={({ pressed }) => [styles.avatar, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <T variant="button">{initials(shop?.shopkeeperName ?? '')}</T>
          </Pressable>
        </View>
      }
      bottomNav={<BottomNav active="home" onChange={router.setTab} />}>
      <T variant="supporting" color={colors.ink2} style={styles.greet}>
        {t('home.greet', { name: (shop?.shopkeeperName ?? '').split(' ')[0] })}
      </T>

      {status === 'error' ? <ErrorBanner message={errorText(t, error)} onRetry={refresh} /> : null}

      <Card style={{ gap: space[4] }}>
        <View style={{ gap: 2 }}>
          <T variant="caption" color={colors.ink2}>
            {t('home.todaysSales')}
          </T>
          <T variant="displayAmount">{formatINR(shop?.todaysBill ?? 0)}</T>
          <T variant="supporting" color={colors.ink2}>
            {shortDate(t, Date.now())}
          </T>
        </View>
        <View style={styles.grid2}>
          <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
            <T variant="supporting" color={colors.ink2}>
              {t('home.thisWeek')}
            </T>
            <T variant="sectionTitle" color={colors.success} style={styles.amount}>
              {formatINR(shop?.weeklyBill ?? 0)}
            </T>
          </View>
          <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
            <T variant="supporting" color={colors.ink2}>
              {t('home.creditToday')}
            </T>
            <T variant="sectionTitle" color={colors.warningText} style={styles.amount}>
              {formatINR(shop?.todaysDues ?? 0)}
            </T>
          </View>
        </View>
      </Card>

      {/* The one blue hero on Home. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.voiceBill')}
        onPress={() => router.push({ name: 'recorder' })}
        style={({ pressed }) => [
          styles.hero,
          shadows.fab,
          { backgroundColor: pressed ? colors.primaryPressed : colors.primary, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}>
        <View style={styles.heroMic}>
          <Icon name="mic" size={24} color={colors.onPrimary} />
        </View>
        <T variant="button" color={colors.onPrimary} style={styles.flex}>
          {t('home.voiceBill')}
        </T>
        <Icon name="chevronRight" size={20} color={colors.onPrimary} />
      </Pressable>

      <View style={styles.quickGrid}>
        {quick.map(q => (
          <Pressable
            key={q.label}
            accessibilityRole="button"
            accessibilityLabel={t(q.label)}
            onPress={q.onPress}
            style={({ pressed }) => [styles.quick, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <View style={[styles.quickWell, { backgroundColor: q.well }]}>
              <Icon name={q.icon} size={20} color={q.tint} />
            </View>
            <T variant="bodyMedium" style={styles.flex}>
              {t(q.label)}
            </T>
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
            {t('home.owe', { count: owing.length, amount: formatINR(owed) })}
          </T>
          <T variant="bodyMedium" color={colors.primary}>
            {t('home.openKhata')}
          </T>
        </Pressable>
      ) : null}

      <View style={{ gap: space[2] }}>
        <View style={styles.between}>
          <T variant="sectionTitle">{t('home.recent')}</T>
          <Pressable accessibilityRole="link" onPress={() => router.setTab('history')} hitSlop={12}>
            <T variant="bodyMedium" color={colors.primary}>
              {t('home.seeAll')}
            </T>
          </Pressable>
        </View>
        <Card padded={false}>
          {txns.length === 0 ? (
            <EmptyState icon="receipt" title={t('home.noBills')} body={t('home.noBillsBody')} />
          ) : (
            txns.slice(0, 4).map((x, i) => (
              <TxnRow key={x.id} t={x} first={i === 0} showDay onPress={x.customerId ? () => router.push({ name: 'customer', id: x.customerId as string }) : undefined} />
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
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
