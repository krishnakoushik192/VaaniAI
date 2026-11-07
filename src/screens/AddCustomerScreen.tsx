import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { TextField } from '../components/Form';
import { AppHeader, Screen } from '../components/Layout';
import { rupees } from '../logic/money';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';

export function AddCustomerScreen() {
  const router = useRouter();
  const { state, addCustomer } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [due, setDue] = useState('');
  const [tried, setTried] = useState(false);

  const dupe = state.customers.some(c => c.name.toLowerCase() === name.trim().toLowerCase());
  const errors = {
    name: name.trim().length < 2 ? 'Enter a name' : dupe ? 'A customer with this name exists' : undefined,
    phone: phone && !/^\d{10}$/.test(phone) ? 'Use 10 digits' : undefined,
    due: due && !(parseFloat(due) >= 0) ? 'Enter an amount' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const save = () => {
    setTried(true);
    if (!valid) {
      return;
    }
    const id = addCustomer({ name, phone: phone || undefined, openingDue: due ? rupees(parseFloat(due)) : 0 });
    router.replace({ name: 'customer', id });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<AppHeader title="Add customer" te="కస్టమర్ జోడించండి" onBack={router.back} />}
        footer={<Button label="Save customer" te="కస్టమర్ సేవ్ చేయండి" onPress={save} />}>
        <TextField label="Name" te="పేరు" value={name} onChangeText={setName} autoFocus autoCapitalize="words" maxLength={40} error={tried ? errors.name : undefined} />
        <TextField
          label="Phone number"
          te="ఫోన్ నంబర్"
          value={phone}
          onChangeText={v => setPhone(v.replace(/\D/g, ''))}
          prefix="+91"
          keyboardType="number-pad"
          maxLength={10}
          help="For reminders on WhatsApp"
          error={tried ? errors.phone : undefined}
        />
        <TextField
          label="Old due (optional)"
          te="పాత బాకీ"
          value={due}
          onChangeText={setDue}
          prefix="₹"
          keyboardType="decimal-pad"
          placeholder="0"
          help="What they already owe from your old book"
          error={tried ? errors.due : undefined}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
