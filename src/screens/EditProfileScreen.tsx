import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { TextField } from '../components/Form';
import { AppHeader, Screen } from '../components/Layout';
import { LogoMark } from '../components/Logo';
import { T } from '../components/Text';
import { useRouter } from '../navigation/Router';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const UPI_RE = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/;

export function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { state, updateProfile } = useStore();
  const p = state.profile;

  const [shopName, setShopName] = useState(p.shopName);
  const [ownerName, setOwnerName] = useState(p.ownerName);
  const [phone, setPhone] = useState(p.phone);
  const [upiId, setUpiId] = useState(p.upiId);
  const [tried, setTried] = useState(false);

  const errors = {
    shopName: shopName.trim().length < 2 ? 'Enter the shop name' : undefined,
    ownerName: ownerName.trim().length < 2 ? 'Enter your name' : undefined,
    phone: phone && !/^\d{10}$/.test(phone) ? 'Use 10 digits' : undefined,
    upiId: upiId && !UPI_RE.test(upiId.trim()) ? 'Looks like name@bank' : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);
  const changed = shopName !== p.shopName || ownerName !== p.ownerName || phone !== p.phone || upiId !== p.upiId;

  const save = () => {
    setTried(true);
    if (!valid) {
      return;
    }
    updateProfile({ shopName: shopName.trim(), ownerName: ownerName.trim(), phone, upiId: upiId.trim() });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        header={<AppHeader title="Edit profile" te="ప్రొఫైల్ మార్చండి" onBack={router.back} />}
        footer={<Button label="Save changes" te="మార్పులు సేవ్ చేయండి" onPress={save} disabled={!changed} />}>
        <View style={[styles.preview, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <LogoMark size={40} ground={isDark ? 'dark' : 'light'} />
          <View style={styles.flex}>
            <T variant="sectionTitle" numberOfLines={1} style={{ fontWeight: '700' }}>
              {shopName.trim() || 'Shop name'}
            </T>
            <T variant="supporting" color={colors.ink2} numberOfLines={1}>
              {ownerName.trim() || 'Your name'}
            </T>
          </View>
        </View>
        <T variant="caption" color={colors.ink2}>
          PREVIEW · HOME HEADER
        </T>

        <TextField
          label="Shop name"
          te="దుకాణం పేరు"
          value={shopName}
          onChangeText={setShopName}
          maxLength={40}
          autoCapitalize="words"
          error={tried ? errors.shopName : undefined}
          help="Shown on Home and on bills"
        />
        <TextField
          label="Shopkeeper name"
          te="యజమాని పేరు"
          value={ownerName}
          onChangeText={setOwnerName}
          maxLength={40}
          autoCapitalize="words"
          error={tried ? errors.ownerName : undefined}
        />
        <TextField
          label="Phone number"
          te="ఫోన్ నంబర్"
          value={phone}
          onChangeText={v => setPhone(v.replace(/\D/g, ''))}
          prefix="+91"
          keyboardType="number-pad"
          maxLength={10}
          error={tried ? errors.phone : undefined}
        />
        <TextField
          label="UPI ID"
          value={upiId}
          onChangeText={setUpiId}
          autoCapitalize="none"
          keyboardType="email-address"
          error={tried ? errors.upiId : undefined}
          help="Customers pay to this ID from the QR"
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { borderWidth: 1, borderRadius: radii.md, padding: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3], marginBottom: -space[3] },
});
