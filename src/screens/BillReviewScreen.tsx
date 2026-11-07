import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { CustomerSheet } from '../components/Sheet';
import { Bi, T } from '../components/Text';
import { BillItem, billTotals, formatINR, lineTotal } from '../logic/money';
import { BillDraft, PaymentMethod, useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const unitLabel = (i: BillItem) => (i.unit === 'pc' ? String(i.qty) : `${i.qty} ${i.unit}`);
const rateLabel = (i: BillItem) => `${formatINR(i.rate)} / ${i.unit === 'pc' ? 'each' : i.unit === 'L' ? 'litre' : i.unit}`;

export function BillReviewScreen({ draft: initial }: { draft: BillDraft }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { customerById, saveBill } = useStore();
  const [draft, setDraft] = useState(initial);
  const [method, setMethod] = useState<PaymentMethod>(initial.method ?? 'upi');
  const [pickOpen, setPickOpen] = useState(false);
  const customer = customerById(draft.customerId);
  const totals = useMemo(() => billTotals(draft.items, draft.discount), [draft]);
  const khataNeedsCustomer = method === 'khata' && !customer;

  const confirm = (id: string) =>
    setDraft(d => ({ ...d, items: d.items.map(x => (x.id === id ? { ...x, needsCheck: false, note: undefined } : x)) }));

  const save = () => {
    if (method === 'upi') {
      router.push({ name: 'payment', draft, total: totals.total });
    } else if (method === 'cash') {
      router.push({ name: 'cashConfirm', draft, total: totals.total });
    } else if (customer) {
      saveBill(draft, 'khata');
      router.resetTo({ name: 'result', kind: 'khata', amount: totals.total, customerId: customer.id, method: 'khata' });
    }
  };

  const saveLabel = totals.needsCheck ? `Check ${totals.needsCheck} item${totals.needsCheck > 1 ? 's' : ''}` : khataNeedsCustomer ? 'Choose a customer' : 'Save bill';

  return (
    <Screen
      header={
        <AppHeader
          title="Review bill"
          te="బిల్లు చూడండి"
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
            label="Edit items"
            variant="secondary"
            style={styles.editBtn}
            onPress={() => router.push({ name: 'editItems', draft, fromReview: true })}
          />
          <Button
            label={saveLabel}
            te={totals.needsCheck || khataNeedsCustomer ? undefined : 'బిల్లు సేవ్ చేయండి'}
            disabled={totals.needsCheck > 0 || totals.total <= 0}
            onPress={khataNeedsCustomer ? () => setPickOpen(true) : save}
            style={styles.flex}
            accessibilityHint={totals.needsCheck ? 'Confirm the highlighted item first' : undefined}
          />
        </View>
      }>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Customer ${customer?.name ?? 'walk-in'}. Change`}
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
        <View style={styles.flex}>
          <T variant="bodyMedium">{customer?.name ?? 'Walk-in customer'}</T>
          {customer && customer.balance > 0 ? (
            <T variant="supporting" color={colors.ink2}>
              Due before this bill · <T variant="supporting" color={colors.warningText} style={styles.bold}>{formatINR(customer.balance)}</T>
            </T>
          ) : null}
        </View>
        <T variant="bodyMedium" color={colors.primary}>
          {customer ? 'Change' : 'Choose'}
        </T>
      </Pressable>

      {totals.needsCheck > 0 ? (
        <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <Icon name="warning" size={20} color={colors.warning} />
          <Bi
            en={`${totals.needsCheck} item${totals.needsCheck > 1 ? 's' : ''} need${totals.needsCheck > 1 ? '' : 's'} checking`}
            te="సరిచూడాలి"
            color={colors.warningText}
            teColor={colors.warningText}
            style={styles.flex}
          />
        </View>
      ) : null}

      {draft.transcript ? (
        <T variant="supporting" color={colors.ink2} numberOfLines={2}>
          “{draft.transcript}”
        </T>
      ) : null}

      <Card padded={false}>
        <View style={[styles.tableRow, styles.tableHead, { backgroundColor: colors.surfaceMuted }]}>
          <T variant="caption" color={colors.ink2} style={styles.flex}>
            ITEM
          </T>
          <T variant="caption" color={colors.ink2} style={styles.colQty}>
            QTY
          </T>
          <T variant="caption" color={colors.ink2} style={styles.colAmt}>
            AMOUNT
          </T>
        </View>
        {draft.items.map(it => (
          <Pressable
            key={it.id}
            disabled={!it.needsCheck}
            onPress={() => confirm(it.id)}
            accessibilityRole={it.needsCheck ? 'button' : undefined}
            accessibilityHint={it.needsCheck ? 'Tap to confirm this item' : undefined}
            style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: it.needsCheck ? colors.warningSoft : colors.surface }]}>
            <View style={styles.flex}>
              <T variant="bodyMedium" numberOfLines={1}>
                {it.name}
              </T>
              <T variant="supporting" color={it.needsCheck ? colors.warningText : colors.ink2}>
                {it.needsCheck ? `${it.note ?? 'Check'} · ${formatINR(it.rate)} each? Tap to confirm` : rateLabel(it)}
              </T>
            </View>
            <T variant="bodyMedium" style={[styles.colQty, styles.medium]}>
              {unitLabel(it)}
            </T>
            <T variant="button" style={[styles.colAmt, styles.num]}>
              {formatINR(lineTotal(it))}
            </T>
          </Pressable>
        ))}
        {draft.discount ? (
          <View style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: colors.line }]}>
            <T variant="bodyMedium" style={styles.flex}>
              Discount
            </T>
            <T variant="button" color={colors.success} style={styles.num}>
              − {formatINR(draft.discount)}
            </T>
          </View>
        ) : null}
        <View style={[styles.totalRow, { backgroundColor: colors.surfaceMuted, borderTopColor: colors.line }]}>
          <View>
            <T variant="bodyMedium">Total</T>
            <T variant="supporting" color={colors.ink2}>
              {totals.count} items
            </T>
          </View>
          <T variant="displayAmount">{formatINR(totals.total)}</T>
        </View>
      </Card>

      <View style={{ gap: space[2] }}>
        <T variant="caption" color={colors.ink2}>
          PAYMENT
        </T>
        <Segmented
          label="Payment method"
          value={method}
          onChange={setMethod}
          options={[
            { key: 'cash', label: 'Cash' },
            { key: 'upi', label: 'UPI' },
            { key: 'khata', label: 'Khata' },
          ]}
        />
        {khataNeedsCustomer ? (
          <T variant="supporting" color={colors.warningText}>
            Khata needs a customer. Choose one above.
          </T>
        ) : null}
      </View>

      <CustomerSheet
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={id => setDraft(d => ({ ...d, customerId: id }))}
        allowWalkIn={method !== 'khata'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '600' },
  medium: { fontWeight: '500' },
  editBtn: { width: 120 },
  footerRow: { flexDirection: 'row', gap: space[3] },
  customer: { minHeight: 56, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  banner: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableRow: { minHeight: 52, paddingHorizontal: space[4], paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  tableHead: { minHeight: 0, paddingVertical: space[2] },
  colQty: { width: 64, textAlign: 'right' },
  colAmt: { width: 72, textAlign: 'right' },
  totalRow: { borderTopWidth: 1, paddingHorizontal: space[4], paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
