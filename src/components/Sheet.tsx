import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Customer } from '../data/sample';
import { formatINR } from '../logic/money';
import { customerStatus, initials, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { StatusChip } from './StatusChip';
import { Bi, T } from './Text';

/** 24px top corners, handle, scrim, slide-up. For quick choices only. */
export function BottomSheet({
  visible,
  onClose,
  title,
  te,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  te?: string;
  children: React.ReactNode;
}) {
  const { colors, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable accessibilityLabel="Close" style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            shadows.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space[4]) + space[2] },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <View style={styles.titleRow}>
            <Bi en={title} te={te} variant="sectionTitle" style={styles.flex} />
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Icon name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** Pick a customer, with search and quick add. */
export function CustomerSheet({
  visible,
  onClose,
  onPick,
  allowWalkIn,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string | null) => void;
  allowWalkIn?: boolean;
}) {
  const { colors } = useTheme();
  const { state, addCustomer } = useStore();
  const [q, setQ] = useState('');
  const list = useMemo(
    () => state.customers.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()) || (c.phone ?? '').includes(q.trim())),
    [state.customers, q],
  );
  const pick = (id: string | null) => {
    setQ('');
    onPick(id);
    onClose();
  };
  const canAdd = q.trim().length >= 2 && !state.customers.some(c => c.name.toLowerCase() === q.trim().toLowerCase());

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Choose customer" te="కస్టమర్‌ను ఎంచుకోండి">
      <View style={[styles.search, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
        <Icon name="search" size={20} color={colors.ink2} />
        <TextInput
          accessibilityLabel="Search or type a new name"
          placeholder="Search or type a new name"
          placeholderTextColor={colors.ink2}
          value={q}
          onChangeText={setQ}
          style={[type.body, styles.flex, { color: colors.ink }]}
        />
      </View>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {canAdd ? (
          <CustomerOption icon="plus" title={`Add "${q.trim()}"`} sub="New customer" onPress={() => pick(addCustomer({ name: q }))} />
        ) : null}
        {allowWalkIn && !q ? <CustomerOption icon="user" title="Walk-in customer" sub="No Khata" onPress={() => pick(null)} /> : null}
        {list.map(c => (
          <CustomerOptionRow key={c.id} c={c} onPress={() => pick(c.id)} />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

function CustomerOption({ icon, title, sub, onPress }: { icon: 'plus' | 'user'; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.flex}>
        <T variant="bodyMedium" color={icon === 'plus' ? colors.primary : colors.ink}>
          {title}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {sub}
        </T>
      </View>
    </Pressable>
  );
}

function CustomerOptionRow({ c, onPress }: { c: Customer; onPress: () => void }) {
  const { colors } = useTheme();
  const st = customerStatus(c);
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.avatar, { backgroundColor: colors.surfaceMuted }]}>
        <T variant="button">{initials(c.name)}</T>
      </View>
      <View style={styles.flex}>
        <T variant="bodyMedium" numberOfLines={1}>
          {c.name}
        </T>
        <T variant="supporting" color={colors.ink2}>
          {c.phone ?? 'No phone'}
        </T>
      </View>
      {st === 'settled' ? null : (
        <View style={styles.trailing}>
          <T variant="bodyMedium" color={colors.warningText}>
            {formatINR(c.balance)}
          </T>
          <StatusChip kind={st} />
        </View>
      )}
    </Pressable>
  );
}

/** Demo fingerprint confirm. Real build: react-native-biometrics / expo-local-authentication. */
export function FingerprintSheet({ visible, onClose, onDone, amountLabel }: { visible: boolean; onClose: () => void; onDone: () => void; amountLabel: string }) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Confirm with fingerprint" te="వేలిముద్రతో నిర్ధారించండి">
      <View style={styles.fp}>
        <T variant="supporting" color={colors.ink2} style={styles.center}>
          Touch the sensor to confirm {amountLabel}.
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fingerprint sensor. Tap to confirm"
          onPress={onDone}
          style={({ pressed }) => [styles.sensor, { backgroundColor: pressed ? colors.primary : colors.primarySoft, borderColor: colors.primary }]}>
          {({ pressed }) => <Icon name="fingerprint" size={44} color={pressed ? colors.onPrimary : colors.primary} />}
        </Pressable>
        <T variant="caption" color={colors.ink2}>
          DEMO · TAP THE SENSOR
        </T>
        <Button label="Use PIN instead" variant="ghost" small onPress={onDone} />
      </View>
    </BottomSheet>
  );
}

/** Two answers to one question: primary + secondary, never two blues. */
export function QuestionSheet({
  visible,
  onClose,
  title,
  te,
  body,
  yes,
  yesTe,
  no,
  onYes,
  onNo,
  noDisabled,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  te?: string;
  body?: string;
  yes: string;
  yesTe?: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  noDisabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title} te={te}>
      <View style={styles.q}>
        {body ? (
          <T variant="body" color={colors.ink2}>
            {body}
          </T>
        ) : null}
        <Button label={yes} te={yesTe} onPress={onYes} />
        <Button label={no} variant="secondary" onPress={onNo} disabled={noDisabled} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'rgba(17,24,39,0.45)' },
  sheet: { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingHorizontal: space[5], paddingTop: space[2], gap: space[4], maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  close: { width: size.touchMin, height: size.touchMin, alignItems: 'center', justifyContent: 'center', marginRight: -space[3] },
  search: { minHeight: size.touchMin + 4, borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  list: { maxHeight: 380 },
  opt: { minHeight: 60, paddingVertical: space[2], flexDirection: 'row', alignItems: 'center', gap: space[3], borderRadius: radii.sm },
  avatar: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  trailing: { alignItems: 'flex-end', gap: 2 },
  fp: { alignItems: 'center', gap: space[4] },
  sensor: { width: 96, height: 96, borderRadius: radii.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  q: { gap: space[3] },
});
