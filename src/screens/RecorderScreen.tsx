import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { TurnItem } from '../api/client';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { T } from '../components/Text';
import { Waveform } from '../components/Waveform';
import { TFn, useT } from '../i18n';
import { mmss } from '../logic/dates';
import { BillItem, billTotals, clientId, formatINR } from '../logic/money';
import { useConversation } from '../logic/useConversation';
import { useRouter } from '../navigation/Router';
import { BillDraft, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';
import { unitText } from './BillReviewScreen';

/** Turn the conversation's bill into the app's bill draft (missing values are flagged). */
function toItems(items: TurnItem[]): BillItem[] {
  return items.map(i => ({
    id: clientId('item'),
    name: i.localName || i.name,
    qty: i.qty ?? 1,
    unit: i.unit,
    rate: i.rate ?? 0,
    needsCheck: i.qty == null || i.rate == null,
    note: i.rate == null ? 'priceMissing' : undefined,
  }));
}

const qtyText = (t: TFn, i: TurnItem) => (i.qty == null ? t('conv.missingQty') : i.unit === 'pc' ? String(i.qty) : `${i.qty} ${unitText(t, i.unit)}`);

/** Voice bill as a conversation: speak, hear it read back, confirm or correct. */
export function RecorderScreen() {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { state, newDraft, customerById, refresh, saveBill } = useStore();
  const [base] = useState(() => newDraft());
  const [saving, setSaving] = useState(false);
  const conv = useConversation({
    token: state.token,
    language: state.language,
    readBack: state.settings.readBack,
    readAll: state.settings.readAll,
    whatToChange: t('conv.whatToChange'),
  });
  const { phase, bill } = conv;
  const items = bill?.items ?? [];
  const asking = !!bill?.question; // every item still missing something is highlighted
  const check = bill?.check ?? null; // "did you mean?": a probably-misheard price or customer
  const checkOptions: { label: string; choice: 0 | 1 }[] =
    check?.kind === 'amount'
      ? [
          { label: formatINR(check.options[1]), choice: 1 }, // the likely one first
          { label: formatINR(check.options[0]), choice: 0 },
        ]
      : check?.kind === 'customer'
      ? [
          { label: customerById(check.options[1])?.name ?? '', choice: 1 as const },
          { label: customerById(check.options[0])?.name ?? conv.customer?.name ?? '', choice: 0 as const },
        ].filter(o => o.label)
      : [];
  const confirming = conv.awaitingConfirm || phase === 'confirm' || phase === 'confirmed';

  const close = () => {
    conv.cancel();
    router.back();
  };

  /**
   * "Yes" (tapped or spoken). A clear bill is saved right here: the payment method was said,
   * the customer is known (khata) and nothing needs checking. Otherwise Review opens.
   */
  const yes = async () => {
    if (!bill || saving) {
      return;
    }
    conv.cancel();
    const customerId = conv.customer?.id ?? null;
    if (customerId && !customerById(customerId)) {
      refresh(); // the server knows a customer this phone has not loaded yet
    }
    const draft: BillDraft = {
      ...base,
      customerId,
      items: toItems(bill.items),
      discount: bill.discount,
      method: bill.method ?? undefined,
      transcript: conv.heard.join(' · '),
      spokenCustomerName: customerId ? undefined : conv.spokenCustomerName ?? undefined,
      spokenLanguage: conv.detectedLanguage ?? undefined,
      spoken: true,
    };
    const method = bill.method;
    const total = billTotals(draft.items, draft.discount).total;
    const unclear = !method || !!bill.check || draft.items.some(i => i.needsCheck) || (!customerId && !!draft.spokenCustomerName) || (method === 'khata' && !customerId);
    if (unclear || (method === 'upi' && !state.shop?.upiId)) {
      router.replace({ name: 'review', draft });
      return;
    }
    if (method === 'upi') {
      router.replace({ name: 'payment', draft, total });
      return;
    }
    setSaving(true);
    try {
      await saveBill(draft, method);
      router.resetTo({ name: 'result', kind: method === 'khata' ? 'khata' : 'paid', amount: total, customerId, method });
    } catch {
      router.replace({ name: 'review', draft }); // not saved: Review shows the bill and can retry
    }
  };

  // Spoken "yes" to the read-back.
  const yesRef = useRef(yes);
  yesRef.current = yes;
  useEffect(() => {
    if (phase === 'confirmed') {
      yesRef.current();
    }
  }, [phase]);

  const typeInstead = () => {
    conv.cancel();
    router.replace({ name: 'editItems', draft: { ...base, items: toItems(items), customerId: conv.customer?.id ?? null } });
  };

  const overline =
    phase === 'listening'
      ? t('rec.listening')
      : phase === 'thinking'
      ? t('rec.working')
      : phase === 'speaking'
      ? t('conv.speaking')
      : phase === 'confirm' || phase === 'confirmed'
      ? t('conv.confirmTitle')
      : check && phase !== 'error'
      ? t('conv.didYouMean')
      : phase === 'error'
      ? t('rec.problem')
      : phase === 'starting'
      ? t('rec.starting')
      : '';

  const dues = conv.customer?.pastDues ?? 0;

  return (
    <Screen
      scroll={false}
      header={
        <AppHeader
          title={t('rec.newBill')}
          onBack={close}
          close
          right={
            <T variant="caption" color={colors.ink2} style={styles.billNo}>
              {t('rec.billNo', { no: base.number })}
            </T>
          }
        />
      }>
      <View style={[styles.panel, { backgroundColor: colors.premium, borderColor: colors.premiumLine }]}>
        {/* What the helper is doing / saying */}
        <View style={styles.top}>
          {overline ? (
            <T variant="caption" color={phase === 'error' ? colors.dangerSoft : colors.premiumAccent} style={styles.overline}>
              {overline}
            </T>
          ) : null}
          {confirming ? (
            // The short read-back ("Ramesh, 3 items, 310 rupees, cash. Save?"); the list below has the items.
            <>
              <T variant="screenTitle" color={colors.onPremium}>
                {conv.replyText || t('conv.confirmQ')}
              </T>
              <T variant="supporting" color={colors.premiumMuted}>
                {t('conv.sayYes')}
              </T>
            </>
          ) : conv.replyText ? (
            <T variant="body" color={colors.onPremium} numberOfLines={4}>
              {conv.replyText}
            </T>
          ) : (
            <>
              <T variant="displaySerif" color={colors.onPremium} style={type.displaySerif}>
                {t('rec.sayTheBill')}
              </T>
              <T variant="body" color={colors.premiumMuted}>
                {t('rec.hint')}
              </T>
            </>
          )}
        </View>

        {/* The bill as it is being written */}
        <ScrollView style={[styles.bill, { borderColor: colors.premiumLine }]} contentContainerStyle={styles.billContent}>
          {conv.customer ? (
            <View style={styles.customer}>
              <Icon name="user" size={18} color={colors.premiumAccent} />
              <View style={styles.flex}>
                <T variant="bodyMedium" color={colors.onPremium}>
                  {conv.customer.name}
                </T>
                {dues > 0 ? (
                  <T variant="supporting" color={colors.premiumAccent}>
                    {t('conv.oldDue', { amount: formatINR(dues) })}
                    {bill?.method === 'khata' ? ` · ${t('conv.afterBill', { amount: formatINR(dues + conv.totals.total) })}` : ''}
                  </T>
                ) : null}
              </View>
            </View>
          ) : conv.spokenCustomerName ? (
            <T variant="supporting" color={colors.premiumAccent}>
              {t('review.customerNotFound', { name: conv.spokenCustomerName })}
            </T>
          ) : null}

          {items.length === 0 ? (
            <T variant="body" color={colors.premiumMuted}>
              {phase === 'listening' || phase === 'starting' ? t('rec.example') : t('conv.empty')}
            </T>
          ) : (
            items.map(i => {
              const missing = i.qty == null || i.rate == null || (check?.kind === 'amount' && check.itemId === i.id);
              const line = i.qty != null && i.rate != null ? formatINR(Math.round(i.qty * i.rate)) : '—';
              return (
                <View
                  key={i.id}
                  style={[styles.item, { borderColor: asking && missing ? colors.premiumAccent : colors.premiumLine }, asking && missing && styles.asked]}>
                  <View style={styles.flex}>
                    <T variant="bodyMedium" color={colors.onPremium} numberOfLines={1}>
                      {i.localName || i.name}
                    </T>
                    <T variant="supporting" color={missing ? colors.premiumAccent : colors.premiumMuted}>
                      {qtyText(t, i)} × {i.rate == null ? t('conv.missingRate') : formatINR(i.rate)}
                    </T>
                  </View>
                  <T variant="button" color={colors.onPremium} style={styles.num}>
                    {line}
                  </T>
                </View>
              );
            })
          )}

          {items.length ? (
            <View style={[styles.totalRow, { borderTopColor: colors.premiumLine }]}>
              <T variant="bodyMedium" color={colors.premiumMuted} style={styles.flex}>
                {t('review.total')}
              </T>
              <T variant="displayAmount" color={colors.onPremium}>
                {formatINR(conv.totals.total)}
              </T>
            </View>
          ) : null}

          {conv.heard.length ? (
            <T variant="supporting" color={colors.premiumMuted} numberOfLines={3}>
              {t('conv.youSaid')}: “{conv.heard[conv.heard.length - 1]}”
            </T>
          ) : null}
        </ScrollView>

        {/* Controls for the current step */}
        {saving ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.premiumAccent} />
            <T variant="bodyMedium" color={colors.onPremium}>
              {t('common.saving')}
            </T>
          </View>
        ) : checkOptions.length === 2 && phase !== 'thinking' && !confirming ? (
          <View style={styles.listen}>
            <View style={styles.stopRow}>
              <T variant="supporting" color={colors.premiumMuted} style={[styles.center, styles.flex]}>
                {phase === 'listening' ? t('conv.listeningChoice') : t('conv.tapOrSay')}
              </T>
              {phase === 'listening' ? (
                <Button label={t('conv.stop')} icon="stop" variant="onPremium" small onPress={conv.mic} accessibilityHint={t('conv.stopHint')} />
              ) : null}
            </View>
            <View style={styles.row}>
              {checkOptions.map((o, n) => (
                <Button
                  key={o.choice}
                  label={o.label}
                  variant={n === 0 ? 'primary' : 'onPremium'}
                  style={styles.flex}
                  accessibilityHint={t('conv.chooseHint')}
                  onPress={() => conv.choose(o.choice)}
                />
              ))}
            </View>
          </View>
        ) : confirming ? (
          <View style={styles.listen}>
            {phase === 'listening' ? (
              <View style={styles.stopRow}>
                <View style={[styles.meter, styles.flex]}>
                  <Waveform active level={conv.level} />
                  <T variant="caption" color={colors.premiumMuted} style={styles.noCaps}>
                    {t('conv.listeningYes')}
                  </T>
                </View>
                <Button label={t('conv.stop')} icon="stop" variant="onPremium" small onPress={conv.mic} accessibilityHint={t('conv.stopHint')} />
              </View>
            ) : phase === 'thinking' ? (
              <View style={styles.statusSm}>
                <ActivityIndicator color={colors.premiumAccent} />
              </View>
            ) : null}
            <View style={styles.row}>
              <Button label={t('conv.no')} variant="onPremium" style={styles.flex} onPress={conv.no} disabled={phase === 'thinking'} />
              <Button label={t('conv.yes')} icon="check" style={styles.flex2} onPress={yes} />
            </View>
          </View>
        ) : phase === 'thinking' ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.premiumAccent} />
            <T variant="bodyMedium" color={colors.onPremium}>
              {t('conv.thinking')}
            </T>
          </View>
        ) : phase === 'speaking' ? (
          <View style={styles.status}>
            <Icon name="speaker" size={22} color={colors.premiumAccent} />
            <Button label={t('conv.skip')} variant="onPremium" small onPress={conv.skip} />
          </View>
        ) : (
          <View style={styles.listen}>
            {phase === 'listening' ? (
              <View style={styles.meter}>
                <Waveform active level={conv.level} />
                <T variant="caption" color={colors.premiumMuted} style={styles.noCaps}>
                  {mmss(conv.seconds)} · {t('rec.maxLength')}
                </T>
              </View>
            ) : conv.error ? (
              <View style={styles.errorRow}>
                <Icon name="warning" size={18} color={colors.danger} />
                <T variant="bodyMedium" color={colors.onPremium} style={styles.flex}>
                  {t(conv.error.key)}
                </T>
              </View>
            ) : null}
            {conv.error?.canOpenSettings ? (
              <Button label={t('rec.openSettings')} variant="onPremium" small onPress={() => Linking.openSettings()} />
            ) : null}
            <View style={styles.row}>
              <Button label={t('rec.typeInstead')} variant="onPremium" small style={styles.flex} onPress={typeInstead} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={phase === 'listening' ? t('conv.tapWhenDone') : t('conv.tapToSpeak')}
                onPress={conv.mic}
                disabled={phase === 'starting'}
                style={({ pressed }) => [
                  styles.mic,
                  { backgroundColor: pressed ? colors.primaryPressed : colors.primary, borderColor: 'rgba(201,169,110,0.3)' },
                ]}>
                {phase === 'listening' ? <View style={styles.stop} /> : <Icon name="mic" size={30} color={colors.onPrimary} />}
              </Pressable>
              <View style={styles.flex}>
                <T variant="caption" color={colors.premiumMuted} style={[styles.noCaps, styles.center]}>
                  {phase === 'listening' ? t('conv.tapWhenDone') : t('conv.tapToSpeak')}
                </T>
              </View>
            </View>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  statusSm: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  noCaps: { letterSpacing: 0 },
  num: { fontVariant: ['tabular-nums'] },
  billNo: { paddingRight: space[3] },
  overline: { letterSpacing: 1 },
  panel: {
    flex: 1,
    marginHorizontal: -space[2],
    marginTop: -space[1],
    marginBottom: -space[6],
    borderWidth: 1,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[8],
    gap: space[4],
  },
  top: { gap: 6 },
  bill: { flex: 1, borderWidth: 1, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.04)' },
  billContent: { padding: space[4], gap: space[3] },
  customer: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  item: { flexDirection: 'row', alignItems: 'center', gap: space[3], borderBottomWidth: 1, paddingBottom: space[2] },
  asked: { borderWidth: 1, borderRadius: radii.sm, padding: space[2] },
  totalRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  status: { minHeight: size.mic, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[3] },
  listen: { gap: space[3] },
  meter: { alignItems: 'center', gap: 4 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  mic: { width: size.mic, height: size.mic, borderRadius: radii.pill, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  stop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#ffffff' },
});
