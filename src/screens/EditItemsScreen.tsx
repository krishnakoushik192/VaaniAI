import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { TextField } from '../components/Form';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { CustomerSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { useT } from '../i18n';
import { BillItem, billTotals, clientId, formatINR, lineTotal, rupees } from '../logic/money';
import { BillDraft, useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';
import { unitText } from './BillReviewScreen';

const UNITS = ['kg', 'L', 'pc'] as const;

type Row = { id: string; name: string; qty: string; unit: string; rate: string; needsCheck?: boolean };

// A line whose price was not heard starts with an empty rate, so it must be typed.
const toRow = (i: BillItem): Row => ({
  id: i.id,
  name: i.name,
  qty: String(i.qty),
  unit: i.unit,
  rate: i.note === 'priceMissing' ? '' : String(i.rate / 100),
  needsCheck: i.needsCheck,
});
const emptyRow = (): Row => ({ id: clientId('item'), name: '', qty: '1', unit: 'kg', rate: '' });
const num = (s: string) => {
  const n = parseFloat(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const rowError = (r: Row) => !r.name.trim() || !(num(r.qty) > 0) || r.rate === '' || !(num(r.rate) >= 0);

export function EditItemsScreen({ draft, fromReview }: { draft: BillDraft; fromReview?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const { customerById } = useStore();
  const [rows, setRows] = useState<Row[]>(() => (draft.items.length ? draft.items.map(toRow) : [emptyRow()]));
  const [discount, setDiscount] = useState(draft.discount ? String(draft.discount / 100) : '');
  const [customerId, setCustomerId] = useState(draft.customerId);
  const [pickOpen, setPickOpen] = useState(false);
  const [tried, setTried] = useState(false);
  const customer = customerById(customerId);

  const set = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch, needsCheck: false } : r)));
  const remove = (id: string) => setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : [emptyRow()]));

  const items: BillItem[] = useMemo(
    () =>
      rows
        .filter(r => !rowError(r))
        .map(r => ({ id: r.id, name: r.name.trim(), qty: num(r.qty), unit: r.unit, rate: rupees(num(r.rate)), needsCheck: r.needsCheck })),
    [rows],
  );
  const disc = discount ? rupees(Math.max(0, num(discount) || 0)) : 0;
  const totals = billTotals(items, disc);
  const valid = rows.every(r => !rowError(r)) && items.length > 0;

  const done = () => {
    setTried(true);
    if (!valid) {
      return;
    }
    const next: BillDraft = { ...draft, items, discount: disc, customerId, spokenCustomerName: customerId ? undefined : draft.spokenCustomerName };
    if (fromReview) {
      router.popAndReplace({ name: 'review', draft: next });
    } else {
      router.replace({ name: 'review', draft: next });
    }
  };

  return (
    <View style={styles.flex}>
      <Screen
        header={
          <AppHeader
            title={draft.method === 'khata' ? t('edit.addCredit') : t('edit.title')}
            onBack={router.back}
            right={
              <T variant="caption" color={colors.ink2} style={{ paddingRight: space[3] }}>
                {draft.number}
              </T>
            }
          />
        }
        footer={<Button label={t('edit.done', { amount: formatINR(totals.total) })} onPress={done} />}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('review.customerA11y', { name: customer?.name ?? t('common.walkIn') })}
          onPress={() => setPickOpen(true)}
          style={[styles.customer, { borderColor: colors.line, backgroundColor: colors.surface }]}>
          <View style={[styles.initial, { backgroundColor: colors.primarySoft }]}>
            {customer ? (
              <T variant="button" color={colors.primary}>
                {initials(customer.name)}
              </T>
            ) : (
              <Icon name="user" size={20} color={colors.primary} />
            )}
          </View>
          <T variant="bodyMedium" style={styles.flex}>
            {customer?.name ?? t('common.walkIn')}
          </T>
          <T variant="bodyMedium" color={colors.primary}>
            {customer ? t('common.change') : t('common.choose')}
          </T>
        </Pressable>

        {rows.map((r, idx) => {
          const err = tried && rowError(r);
          const amount = !rowError(r) ? lineTotal({ id: r.id, name: r.name, qty: num(r.qty), unit: r.unit, rate: rupees(num(r.rate)) }) : 0;
          const units: string[] = UNITS.includes(r.unit as (typeof UNITS)[number]) ? [...UNITS] : [...UNITS, r.unit];
          return (
            <Card key={r.id} style={[styles.item, { borderColor: err ? colors.danger : r.needsCheck ? colors.warning : colors.line }]}>
              <View style={styles.itemTop}>
                <T variant="caption" color={colors.ink2} style={styles.flex}>
                  {t('edit.itemN', { n: idx + 1 })}
                </T>
                <T variant="button" style={styles.num}>
                  {formatINR(amount)}
                </T>
                <Pressable accessibilityRole="button" accessibilityLabel={t('edit.removeItem', { n: idx + 1 })} onPress={() => remove(r.id)} style={styles.trash}>
                  <Icon name="trash" size={20} color={colors.danger} />
                </Pressable>
              </View>
              <TextInput
                accessibilityLabel={t('edit.nameA11y', { n: idx + 1 })}
                placeholder={t('edit.namePlaceholder')}
                placeholderTextColor={colors.ink2}
                value={r.name}
                onChangeText={v => set(r.id, { name: v })}
                style={[type.body, styles.input, { borderColor: colors.lineStrong, color: colors.ink }]}
              />
              <View style={styles.inline}>
                <TextInput
                  accessibilityLabel={t('edit.qtyA11y')}
                  keyboardType="decimal-pad"
                  value={r.qty}
                  onChangeText={v => set(r.id, { qty: v })}
                  style={[type.body, styles.input, styles.qty, { borderColor: colors.lineStrong, color: colors.ink }]}
                />
                <View style={[styles.units, { backgroundColor: colors.surfaceMuted }]}>
                  {units.map(u => {
                    const on = r.unit === u;
                    return (
                      <Pressable
                        key={u}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        onPress={() => set(r.id, { unit: u })}
                        style={[styles.unit, on && { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                        <T variant="bodyMedium" color={on ? colors.primary : colors.ink2}>
                          {unitText(t, u)}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={[styles.input, styles.rate, { borderColor: r.needsCheck || (tried && r.rate === '') ? colors.warning : colors.lineStrong }]}>
                  <T variant="body" color={colors.ink2}>
                    ₹
                  </T>
                  <TextInput
                    accessibilityLabel={t('edit.rateA11y', { unit: unitText(t, r.unit) })}
                    keyboardType="decimal-pad"
                    placeholder={t('edit.rate')}
                    placeholderTextColor={colors.ink2}
                    value={r.rate}
                    onChangeText={v => set(r.id, { rate: v })}
                    style={[type.body, styles.flex, styles.rateInput, { color: colors.ink }]}
                  />
                </View>
              </View>
              {err ? (
                <T variant="supporting" color={colors.danger}>
                  {t('edit.rowError')}
                </T>
              ) : null}
            </Card>
          );
        })}

        <Button label={t('edit.addItem')} icon="plus" variant="secondary" small onPress={() => setRows(rs => [...rs, emptyRow()])} />

        <TextField label={t('edit.discount')} prefix="₹" keyboardType="decimal-pad" value={discount} onChangeText={setDiscount} placeholder="0" />

        <View style={[styles.totals, { backgroundColor: colors.surfaceMuted }]}>
          <T variant="supporting" color={colors.ink2}>
            {t('edit.summary', { count: totals.count, subtotal: formatINR(totals.subtotal) })}
            {disc ? t('edit.summaryDiscount', { amount: formatINR(disc) }) : ''}
          </T>
          <T variant="displayAmount">{formatINR(totals.total)}</T>
        </View>
      </Screen>
      <CustomerSheet visible={pickOpen} onClose={() => setPickOpen(false)} onPick={setCustomerId} allowWalkIn />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  rateInput: { padding: 0 },
  customer: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  item: { gap: space[3], padding: space[4] },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  trash: { width: size.touchMin, height: size.touchMin, alignItems: 'flex-end', justifyContent: 'center', marginVertical: -space[3] },
  input: { minHeight: size.touchMin, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], paddingVertical: 8 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  qty: { width: 64, textAlign: 'center' },
  units: { flexDirection: 'row', borderRadius: radii.sm, padding: 3, gap: 2 },
  unit: { minWidth: 36, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  rate: { flex: 1, minWidth: 96, flexDirection: 'row', alignItems: 'center', gap: 4 },
  totals: { borderRadius: radii.md, padding: space[4], gap: 2, alignItems: 'flex-end' },
});
