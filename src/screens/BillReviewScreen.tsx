import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { CustomerSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { errorText, TFn, useT } from '../i18n';
import { BillItem, billTotals, formatINR, lineTotal } from '../logic/money';
import { useReadAloud } from '../logic/useReadAloud';
import { BillDraft, PaymentMethod, useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

export const unitText = (t: TFn, unit: string) => {
  const key = `unit.${unit}` as Parameters<TFn>[0];
  const s = t(key);
  return s === key ? unit : s;
};
const qtyLabel = (t: TFn, i: BillItem) => (i.unit === 'pc' ? String(i.qty) : `${i.qty} ${unitText(t, i.unit)}`);
const rateLabel = (t: TFn, i: BillItem) =>
  `${formatINR(i.rate)} / ${i.unit === 'pc' ? t('unit.each') : i.unit === 'L' ? t('unit.litre') : unitText(t, i.unit)}`;

export function BillReviewScreen({ draft: initial }: { draft: BillDraft }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { customerById, saveBill } = useStore();
  const [draft, setDraft] = useState(initial);
  const [method, setMethod] = useState<PaymentMethod>(initial.method ?? 'upi');
  const [pickOpen, setPickOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customer = customerById(draft.customerId);
  const totals = useMemo(() => billTotals(draft.items, draft.discount), [draft]);
  const khataNeedsCustomer = method === 'khata' && !customer;

  const confirm = (it: BillItem) => {
    if (it.note === 'priceMissing') {
      router.push({ name: 'editItems', draft, fromReview: true }); // a missing price must be typed
      return;
    }
    setDraft(d => ({ ...d, items: d.items.map(x => (x.id === it.id ? { ...x, needsCheck: false, note: undefined } : x)) }));
  };

  const save = async () => {
    if (method === 'upi') {
      router.push({ name: 'payment', draft, total: totals.total });
      return;
    }
    if (method === 'cash') {
      router.push({ name: 'cashConfirm', draft, total: totals.total });
      return;
    }
    if (!customer || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBill(draft, 'khata');
      router.resetTo({ name: 'result', kind: 'khata', amount: totals.total, customerId: customer.id, method: 'khata' });
    } catch (e) {
      setError(errorText(t, e));
      setSaving(false);
    }
  };

  const saveLabel = saving
    ? t('common.saving')
    : totals.needsCheck
    ? t('review.checkN', { count: totals.needsCheck })
    : khataNeedsCustomer
    ? t('review.chooseCustomer')
    : t('review.saveBill');

  return (
    <Screen
      header={
        <AppHeader
          title={t('review.title')}
          onBack={router.back}
          right={
            <T variant="caption" color={colors.ink2} style={{ paddingRight: space[3] }}>
              {draft.number}
            </T>
          }
        />
      }
      footer={
        <View style={styles.footerRow}>
          <Button
            label={t('review.editItems')}
            variant="secondary"
            style={styles.editBtn}
            disabled={saving}
            onPress={() => router.push({ name: 'editItems', draft, fromReview: true })}
          />
          <Button
            label={saveLabel}
            disabled={saving || totals.needsCheck > 0 || totals.total <= 0}
            onPress={khataNeedsCustomer ? () => setPickOpen(true) : save}
            style={styles.flex}
            accessibilityHint={totals.needsCheck ? t('review.confirmHint') : undefined}
          />
        </View>
      }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('review.customerA11y', { name: customer?.name ?? t('common.walkIn') })}
        onPress={() => setPickOpen(true)}
        style={[styles.customer, { borderColor: khataNeedsCustomer ? colors.warning : colors.line, backgroundColor: colors.surface }]}>
        <View style={[styles.initial, { backgroundColor: colors.primarySoft }]}>
          {customer ? (
            <T variant="button" color={colors.primary}>
              {initials(customer.name)}
            </T>
          ) : (
            <Icon name="user" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.flex}>
          <T variant="bodyMedium">{customer?.name ?? t('common.walkIn')}</T>
          {customer && customer.balance > 0 ? (
            <T variant="supporting" color={colors.warningText}>
              {t('review.dueBefore', { amount: formatINR(customer.balance) })}
            </T>
          ) : null}
        </View>
        <T variant="bodyMedium" color={colors.primary}>
          {customer ? t('common.change') : t('common.choose')}
        </T>
      </Pressable>

      {!customer && draft.spokenCustomerName ? (
        <T variant="supporting" color={colors.warningText}>
          {t('review.customerNotFound', { name: draft.spokenCustomerName })}
        </T>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={save} /> : null}

      {totals.needsCheck > 0 ? (
        <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Icon name="warning" size={20} color={colors.warning} />
          <T variant="bodyMedium" color={colors.warningText} style={styles.flex}>
            {t('review.needChecking', { count: totals.needsCheck })}
          </T>
        </View>
      ) : null}

      {draft.transcript ? <HeardCard draftId={draft.id} text={draft.transcript} language={draft.spokenLanguage} autoPlay={!draft.spoken} /> : null}

      <Card padded={false}>
        <View style={[styles.tableRow, styles.tableHead, { backgroundColor: colors.surfaceMuted }]}>
          <T variant="caption" color={colors.ink2} style={styles.flex}>
            {t('review.colItem')}
          </T>
          <T variant="caption" color={colors.ink2} style={styles.colQty}>
            {t('review.colQty')}
          </T>
          <T variant="caption" color={colors.ink2} style={styles.colAmt}>
            {t('review.colAmount')}
          </T>
        </View>
        {draft.items.map(it => (
          <Pressable
            key={it.id}
            disabled={!it.needsCheck}
            onPress={() => confirm(it)}
            accessibilityRole={it.needsCheck ? 'button' : undefined}
            accessibilityHint={it.needsCheck ? t('review.confirmHint') : undefined}
            style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: it.needsCheck ? colors.warningSoft : colors.surface }]}>
            <View style={styles.flex}>
              <T variant="bodyMedium" numberOfLines={1}>
                {it.name}
              </T>
              <T variant="supporting" color={it.needsCheck ? colors.warningText : colors.ink2}>
                {it.note === 'priceMissing'
                  ? t('review.priceMissing')
                  : it.needsCheck
                  ? t('review.tapToConfirm', { rate: formatINR(it.rate) })
                  : rateLabel(t, it)}
              </T>
            </View>
            <T variant="bodyMedium" style={[styles.colQty, styles.medium]}>
              {qtyLabel(t, it)}
            </T>
            <T variant="button" style={[styles.colAmt, styles.num]}>
              {formatINR(lineTotal(it))}
            </T>
          </Pressable>
        ))}
        {draft.discount ? (
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <T variant="bodyMedium" style={styles.flex}>
              {t('review.discount')}
            </T>
            <T variant="button" color={colors.success} style={styles.num}>
              − {formatINR(draft.discount)}
            </T>
          </View>
        ) : null}
        <View style={[styles.totalRow, { backgroundColor: colors.surfaceMuted, borderTopColor: colors.line }]}>
          <View>
            <T variant="bodyMedium">{t('review.total')}</T>
            <T variant="supporting" color={colors.ink2}>
              {t('review.itemsCount', { count: totals.count })}
            </T>
          </View>
          <T variant="displayAmount">{formatINR(totals.total)}</T>
        </View>
      </Card>

      <View style={{ gap: space[2] }}>
        <T variant="caption" color={colors.ink2}>
          {t('review.payment')}
        </T>
        <Segmented
          label={t('review.paymentMethod')}
          value={method}
          onChange={setMethod}
          options={[
            { key: 'cash', label: t('method.cash') },
            { key: 'upi', label: t('method.upi') },
            { key: 'khata', label: t('method.khata') },
          ]}
        />
        {khataNeedsCustomer ? (
          <T variant="supporting" color={colors.warningText}>
            {t('review.khataNeedsCustomer')}
          </T>
        ) : null}
      </View>

      <CustomerSheet
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={id => setDraft(d => ({ ...d, customerId: id, spokenCustomerName: undefined }))}
        allowWalkIn={method !== 'khata'}
      />
    </Screen>
  );
}

// Drafts already read aloud once, so coming back from Edit items does not read it again.
const autoRead = new Set<string>();
const COLLAPSED_LINES = 4;
const LONG_TEXT = 140;

/** "What we heard": the full transcript (expandable) with a Listen / Stop button. */
function HeardCard({ draftId, text, language, autoPlay }: { draftId: string; text: string; language?: string; autoPlay: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const { state } = useStore();
  const voice = useReadAloud(state.token);
  const [expanded, setExpanded] = useState(false);
  const long = text.length > LONG_TEXT; // roughly more than 4 lines on a phone

  // After a voice bill, read what was heard aloud once (Settings → "Read voice bills aloud").
  const { play } = voice;
  const readBack = state.settings.readBack && autoPlay;
  useEffect(() => {
    if (readBack && !autoRead.has(draftId)) {
      autoRead.add(draftId);
      play(text, language);
    }
  }, [readBack, draftId, text, language, play]);

  const busy = voice.state === 'loading' || voice.state === 'playing';
  return (
    <View style={[styles.heard, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <View style={styles.heardTop}>
        <T variant="caption" color={colors.ink2} style={styles.flex}>
          {t('review.heard')}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={busy ? t('review.stopListening') : t('review.listen')}
          onPress={() => (busy ? voice.stop() : voice.play(text, language))}
          hitSlop={8}
          style={({ pressed }) => [styles.listen, { borderColor: colors.primary, backgroundColor: pressed ? colors.primarySoft : 'transparent' }]}>
          {voice.state === 'loading' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name={busy ? 'stop' : 'speaker'} size={18} color={colors.primary} />
          )}
          <T variant="bodyMedium" color={colors.primary}>
            {voice.state === 'loading' ? t('review.loadingAudio') : busy ? t('review.stopListening') : t('review.listen')}
          </T>
        </Pressable>
      </View>
      <T
        variant="body"
        color={colors.ink}
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
        “{text}”
      </T>
      {long ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded(x => !x)} hitSlop={8}>
          <T variant="bodyMedium" color={colors.primary}>
            {expanded ? t('review.showLess') : t('review.showMore')}
          </T>
        </Pressable>
      ) : null}
      {voice.state === 'error' ? (
        <T variant="supporting" color={colors.danger}>
          {t('review.listenFailed')}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heard: { borderWidth: 1, borderRadius: radii.md, padding: space[4], gap: space[2] },
  heardTop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  listen: { minHeight: 36, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  medium: { fontWeight: '500' },
  editBtn: { flexBasis: '38%' },
  footerRow: { flexDirection: 'row', gap: space[3] },
  customer: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  banner: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableRow: { minHeight: 52, paddingHorizontal: space[4], paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableHead: { minHeight: 0, paddingVertical: space[2] },
  colQty: { width: 72, textAlign: 'right' },
  colAmt: { width: 80, textAlign: 'right' },
  totalRow: { borderTopWidth: 1, paddingHorizontal: space[4], paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
