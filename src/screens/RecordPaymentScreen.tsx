import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { TextField } from '../components/Form';
import { Icon } from '../components/Icon';
import { AppHeader, Screen } from '../components/Layout';
import { Segmented } from '../components/Segmented';
import { CustomerSheet, FingerprintSheet } from '../components/Sheet';
import { T } from '../components/Text';
import { clientId, formatINR, rupees } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { initials, useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

export function RecordPaymentScreen({ customerId: initialId }: { customerId?: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const { state, customerById, recordPayment } = useStore();
  const [customerId, setCustomerId] = useState<string | null>(initialId ?? null);
  const c = customerById(customerId);
  const [amount, setAmount] = useState(c && c.balance > 0 ? String(c.balance / 100) : '');
  const [method, setMethod] = useState<'cash' | 'upi'>('cash');
  const [pickOpen, setPickOpen] = useState(!initialId);
  const [fp, setFp] = useState(false);
  const [tried, setTried] = useState(false);
  const [payId] = useState(() => clientId('pay'));

  const value = parseFloat(amount);
  const paise = Number.isFinite(value) ? rupees(value) : 0;
  const error = !c ? 'Choose a customer' : !(paise > 0) ? 'Enter the amount received' : undefined;

  const commit = () => {
    if (!c) {
      return;
    }
    recordPayment(c.id, paise, method, payId);
    router.resetTo({ name: 'result', kind: 'payment', amount: paise, customerId: c.id, method });
  };
  const save = () => {
    setTried(true);
    if (error) {
      return;
    }
    if (state.settings.fingerprint) {
      setFp(true);
    } else {
      commit();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<AppHeader title="Record payment" te="చెల్లింపు నమోదు" onBack={router.back} />}
        footer={<Button label={paise > 0 ? `Save payment · ${formatINR(paise)}` : 'Save payment'} onPress={save} />}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c ? `Customer ${c.name}. Change` : 'Choose customer'}
          onPress={() => setPickOpen(true)}
          style={[styles.customer, { borderColor: tried && !c ? colors.danger : colors.line, backgroundColor: colors.surface }]}>
          <View style={[styles.initial, { backgroundColor: colors.primarySoft }]}>
            {c ? (
              <T variant="button" color={colors.primary}>
                {initials(c.name)}
              </T>
            ) : (
              <Icon name="user" size={20} color={colors.primary} />
            )}
          </View>
          <View style={styles.flex}>
            <T variant="bodyMedium">{c?.name ?? 'Choose customer'}</T>
            {c ? (
              <T variant="supporting" color={c.balance > 0 ? colors.warningText : colors.ink2}>
                {c.balance > 0 ? `Owes ${formatINR(c.balance)}` : 'Nothing due'}
              </T>
            ) : null}
          </View>
          <T variant="bodyMedium" color={colors.primary}>
            {c ? 'Change' : 'Choose'}
          </T>
        </Pressable>

        <TextField
          label="Amount received"
          te="అందిన మొత్తం"
          prefix="₹"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          error={tried && c ? error : undefined}
          help={c && paise > c.balance && c.balance > 0 ? `${formatINR(paise - c.balance)} more than due. It will show as advance.` : undefined}
        />

        {c && c.balance > 0 ? (
          <View style={styles.chips}>
            {[c.balance, Math.round(c.balance / 2)].map(v => (
              <Pressable
                key={v}
                accessibilityRole="button"
                onPress={() => setAmount(String(v / 100))}
                style={[styles.chip, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
                <T variant="bodyMedium">{v === c.balance ? `Full ${formatINR(v)}` : `Half ${formatINR(v)}`}</T>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ gap: space[2] }}>
          <T variant="caption" color={colors.ink2}>
            PAID BY
          </T>
          <Segmented
            label="Paid by"
            value={method}
            onChange={setMethod}
            options={[
              { key: 'cash', label: 'Cash' },
              { key: 'upi', label: 'Online · UPI' },
            ]}
          />
        </View>
      </Screen>
      <CustomerSheet
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={id => {
          setCustomerId(id);
          const picked = customerById(id);
          setAmount(picked && picked.balance > 0 ? String(picked.balance / 100) : '');
        }}
      />
      <FingerprintSheet
        visible={fp}
        onClose={() => setFp(false)}
        amountLabel={`${formatINR(paise)} received`}
        onDone={() => {
          setFp(false);
          commit();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  customer: { minHeight: 64, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: space[4], paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  initial: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap', marginTop: -space[2] },
  chip: { minHeight: 44, paddingHorizontal: space[4], borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center' },
});
