import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Customer } from '../data/types';
import { errorText, useT } from '../i18n';
import { formatINR, rupees } from '../logic/money';
import { customerStatus, initials, useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { StatusChip } from './StatusChip';
import { Bi, T } from './Text';
import { ErrorBanner } from './Feedback';
import { TextField } from './Form';

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
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior="padding" style={styles.wrap}>
        <Pressable accessibilityLabel={t('common.close')} style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            shadows.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space[4]) + space[2] },
          ]}>
          <View style={[styles.handle, { backgroundColor: colors.line }]} />
          <View style={styles.titleRow}>
            <Bi en={title} te={te} variant="sectionTitle" style={styles.flex} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={styles.close}>
              <Icon name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Pick a customer, with search. "Add new customer" opens a small form: name, phone, old dues. */
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
  const t = useT();
  const { customers } = useStore();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false); // showing the new-customer form
  const list = useMemo(
    () => customers.filter(c => c.name.toLowerCase().includes(q.trim().toLowerCase()) || (c.phone ?? '').includes(q.trim())),
    [customers, q],
  );
  const close = () => {
    setQ('');
    setAdding(false);
    onClose();
  };
  const pick = (id: string | null) => {
    onPick(id);
    close();
  };
  const typed = q.trim();
  const exactMatch = customers.some(c => c.name.toLowerCase() === typed.toLowerCase());
  const typedName = typed.length >= 2 && !/^\d+$/.test(typed); // a name typed in search (not a phone number)

  return (
    <BottomSheet visible={visible} onClose={close} title={adding ? t('add.title') : t('sheet.chooseCustomer')}>
      {adding ? (
        <NewCustomerForm initialName={typedName ? typed : ''} initialPhone={/^\d{10}$/.test(typed) ? typed : ''} onSaved={pick} onCancel={() => setAdding(false)} />
      ) : (
        <>
          <View style={[styles.search, { borderColor: colors.lineStrong, backgroundColor: colors.surface }]}>
            <Icon name="search" size={20} color={colors.ink2} />
            <TextInput
              accessibilityLabel={t('sheet.search')}
              placeholder={t('sheet.search')}
              placeholderTextColor={colors.ink2}
              value={q}
              onChangeText={setQ}
              style={[type.body, styles.flex, { color: colors.ink }]}
            />
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {!exactMatch ? (
              <CustomerOption
                icon="plus"
                title={typedName ? t('sheet.addNamed', { name: typed }) : t('sheet.addNew')}
                sub={typedName ? t('sheet.newCustomer') : t('sheet.addNewSub')}
                onPress={() => setAdding(true)}
              />
            ) : null}
            {allowWalkIn && !q ? <CustomerOption icon="user" title={t('common.walkIn')} sub={t('sheet.noKhata')} onPress={() => pick(null)} /> : null}
            {list.map(c => (
              <CustomerOptionRow key={c.id} c={c} onPress={() => pick(c.id)} />
            ))}
          </ScrollView>
        </>
      )}
    </BottomSheet>
  );
}

const PHONE_RE = /^[6-9]\d{9}$/;

/** Name (required), phone (optional), old dues (optional) → creates the customer on the server. */
function NewCustomerForm({
  initialName,
  initialPhone,
  onSaved,
  onCancel,
}: {
  initialName: string;
  initialPhone: string;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { customers, addCustomer } = useStore();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [due, setDue] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dueValue = parseFloat(due);
  const errors = {
    name:
      name.trim().length < 2
        ? t('add.errName')
        : customers.some(c => c.name.toLowerCase() === name.trim().toLowerCase())
        ? t('add.errDupe')
        : undefined,
    phone: phone && !PHONE_RE.test(phone) ? t('add.errPhone') : undefined,
    due: due && !(dueValue >= 0) ? t('add.errAmount') : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const save = async () => {
    setTried(true);
    if (!valid || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await addCustomer({ name, phone: phone || undefined, openingDue: due ? rupees(dueValue) : 0 }));
    } catch (e) {
      setError(errorText(t, e, { 409: 'err.phoneTaken' }));
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.formScroll} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      {error ? <ErrorBanner message={error} onRetry={save} /> : null}
      <TextField
        label={`${t('add.name')} *`}
        value={name}
        onChangeText={setName}
        autoFocus={!initialName}
        autoCapitalize="words"
        maxLength={40}
        error={tried ? errors.name : undefined}
      />
      <TextField
        label={t('add.phoneOptional')}
        value={phone}
        onChangeText={v => setPhone(v.replace(/\D/g, ''))}
        prefix="+91"
        keyboardType="number-pad"
        maxLength={10}
        autoFocus={!!initialName && !initialPhone}
        help={t('add.phoneHelp')}
        error={tried ? errors.phone : undefined}
      />
      <TextField
        label={t('add.oldDue')}
        value={due}
        onChangeText={setDue}
        prefix="₹"
        keyboardType="decimal-pad"
        placeholder="0"
        help={t('add.oldDueHelp')}
        error={tried ? errors.due : undefined}
      />
      <View style={styles.formButtons}>
        <Button label={t('common.cancel')} variant="secondary" style={styles.flex} onPress={onCancel} disabled={saving} />
        <Button label={saving ? t('common.saving') : t('add.save')} style={styles.flex} onPress={save} disabled={saving} />
      </View>
    </ScrollView>
  );
}

function CustomerOption({
  icon,
  title,
  sub,
  onPress,
  disabled,
}: {
  icon: 'plus' | 'user';
  title: string;
  sub: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.opt, pressed && { backgroundColor: colors.surfaceMuted }]}>
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
  const t = useT();
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
          {c.phone ?? t('common.noPhone')}
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

/** Two answers to one question: primary + secondary, never two blues. */
export function QuestionSheet({
  visible,
  onClose,
  title,
  body,
  yes,
  no,
  onYes,
  onNo,
  noDisabled,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  noDisabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.q}>
        {body ? (
          <T variant="body" color={colors.ink2}>
            {body}
          </T>
        ) : null}
        <Button label={yes} onPress={onYes} />
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
  formScroll: { flexGrow: 0 },
  form: { gap: space[4], paddingBottom: space[2] },
  formButtons: { flexDirection: 'row', gap: space[3] },
});
