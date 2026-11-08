import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { TextField } from '../components/Form';
import { AppHeader, Screen } from '../components/Layout';
import { errorText, useT } from '../i18n';
import { rupees } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';

const PHONE_RE = /^[6-9]\d{9}$/;

export function AddCustomerScreen() {
  const t = useT();
  const router = useRouter();
  const { customers, addCustomer } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [due, setDue] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dupe = customers.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
  const dueValue = parseFloat(due);
  const errors = {
    name: name.trim().length < 2 ? t('add.errName') : dupe ? t('add.errDupe') : undefined,
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
      const id = await addCustomer({ name, phone: phone || undefined, openingDue: due ? rupees(dueValue) : 0 });
      router.replace({ name: 'customer', id });
    } catch (e) {
      setError(errorText(t, e, { 409: 'err.phoneTaken' }));
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Screen
        header={<AppHeader title={t('add.title')} onBack={router.back} />}
        footer={<Button label={saving ? t('common.saving') : t('add.save')} onPress={save} disabled={saving} />}>
        {error ? <ErrorBanner message={error} onRetry={save} /> : null}
        <TextField
          label={t('add.name')}
          value={name}
          onChangeText={setName}
          autoFocus
          autoCapitalize="words"
          maxLength={40}
          error={tried ? errors.name : undefined}
        />
        <TextField
          label={t('add.phone')}
          value={phone}
          onChangeText={v => setPhone(v.replace(/\D/g, ''))}
          prefix="+91"
          keyboardType="number-pad"
          maxLength={10}
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
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
