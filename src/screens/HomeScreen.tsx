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
import { customerStatus, useStore } from '../store/AppStore';
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
  const needsUpi = !!shop && !shop.upiId;
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
            accessibilityLabel={needsUpi ? `${t('home.settings')}. ${t('home.setupUpi')}` : t('home.settings')}
            onPress={() => router.push({ name: 'settings' })}
            style={({ pressed }) => [styles.settings, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
            <Icon name="settings" size={20} color={colors.ink} />
            <T variant="button">{t('home.settings')}</T>
            {needsUpi ? <View style={[styles.badgeDot, { backgroundColor: colors.danger, borderColor: colors.surface }]} /> : null}
          </Pressable>
        </View>
      }
      bottomNav={<BottomNav active="home" onChange={router.setTab} />}>
      <T variant="supporting" color={colors.ink2} style={styles.greet}>
        {t('home.greet', { name: (shop?.shopkeeperName ?? '').split(' ')[0] })}
      </T>

      {status === 'error' ? <ErrorBanner message={errorText(t, error)} onRetry={refresh} /> : null}

      {needsUpi || customers.length === 0 ? (
        <SetupCard
          needsUpi={needsUpi}
          needsCustomer={customers.length === 0}
          onUpi={() => router.push({ name: 'upi' })}
          onCustomer={() => router.push({ name: 'addCustomer' })}
        />
      ) : null}

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

/** "Finish setting up": shown until the UPI ID is added and there is a first customer. */
function SetupCard({ needsUpi, needsCustomer, onUpi, onCustomer }: { needsUpi: boolean; needsCustomer: boolean; onUpi: () => void; onCustomer: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  const done = 1 + (needsUpi ? 0 : 1) + (needsCustomer ? 0 : 1);
  const all: { key: string; label: StringKey; done: boolean; onPress?: () => void }[] = [
    { key: 'upi', label: 'home.setupUpi', done: !needsUpi, onPress: onUpi },
    { key: 'customer', label: 'home.setupCustomer', done: !needsCustomer, onPress: onCustomer },
    { key: 'shop', label: 'home.setupShop', done: true },
  ];
  const steps = [...all.filter(s => !s.done), ...all.filter(s => s.done)]; // still to do first
  return (
    <Card style={[styles.setup, { borderColor: colors.warning }]}>
      <View style={styles.between}>
        <T variant="sectionTitle" style={styles.bold}>
          {t('home.setupTitle')}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {t('home.setupProgress', { done, total: 3 })}
        </T>
      </View>
      <View style={[styles.progress, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.success, width: `${(done / 3) * 100}%` }]} />
      </View>
      {steps.map(s =>
        s.done ? (
          <View key={s.key} style={styles.setupRow}>
            <Icon name="check" size={20} color={colors.success} strokeWidth={2.4} />
            <T variant="bodyMedium" color={colors.ink2} style={[styles.flex, styles.struck]}>
              {t(s.label)}
            </T>
          </View>
        ) : (
          <Pressable
            key={s.key}
            accessibilityRole="button"
            onPress={s.onPress}
            style={({ pressed }) => [styles.setupRow, styles.setupTodo, { backgroundColor: pressed ? colors.surfaceMuted : s.key === 'upi' ? colors.warningSoft : colors.surface }]}>
            <Icon name={s.key === 'upi' ? 'qr' : 'userPlus'} size={20} color={s.key === 'upi' ? colors.warningText : colors.primary} />
            <T variant="bodyMedium" color={s.key === 'upi' ? colors.warningText : colors.ink} style={styles.flex}>
              {t(s.label)}
            </T>
            <T variant="button" color={colors.primary}>
              {t('home.setupAdd')}
            </T>
          </Pressable>
        ),
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  settings: { minHeight: size.touchMin - 4, borderRadius: radii.pill, borderWidth: 1, paddingLeft: 10, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { position: 'absolute', top: 4, right: 6, width: 10, height: 10, borderRadius: radii.pill, borderWidth: 2 },
  setup: { gap: space[3], borderWidth: 1 },
  progress: { height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: 6 },
  setupRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[3] },
  setupTodo: { minHeight: 52, borderRadius: radii.sm },
  struck: { textDecorationLine: 'line-through' },
  bold: { fontWeight: '700' },
  header: { height: size.headerH + 8, paddingHorizontal: space[5], flexDirection: 'row', alignItems: 'center', gap: space[3] },
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
