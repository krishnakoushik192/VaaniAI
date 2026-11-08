import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { TextField } from '../components/Form';
import { Screen } from '../components/Layout';
import { LogoLockup } from '../components/Logo';
import { T } from '../components/Text';
import { errorText, LANGUAGES, useT } from '../i18n';
import { useStore } from '../store/AppStore';
import { radii, space, useTheme } from '../theme';

const MOBILE_RE = /^[6-9]\d{9}$/;
const PASSCODE_RE = /^\d{4,6}$/;

/** Mobile number + passcode. One link switches to "create account" (adds shop and owner name). */
export function LoginScreen() {
  const { colors, isDark } = useTheme();
  const t = useT();
  const { state, login, register, setLanguage } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [mobile, setMobile] = useState('');
  const [passcode, setPasscode] = useState('');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(state.sessionExpired ? t('err.sessionExpired') : null);

  const isRegister = mode === 'register';
  const errors = {
    shopName: isRegister && shopName.trim().length < 2 ? t('login.errShopName') : undefined,
    name: isRegister && name.trim().length < 2 ? t('login.errName') : undefined,
    mobile: !MOBILE_RE.test(mobile) ? t('login.errMobile') : undefined,
    passcode: !PASSCODE_RE.test(passcode) ? t('login.errPasscode') : undefined,
  };
  const valid = !Object.values(errors).some(Boolean);

  const submit = async () => {
    setTried(true);
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isRegister) {
        await register({ shopName: shopName.trim(), shopkeeperName: name.trim(), mobileNumber: mobile, passcode });
      } else {
        await login(mobile, passcode);
      }
      // Success: the app switches to Home by itself (the session is set).
    } catch (e) {
      setError(
        errorText(t, e, isRegister ? { 409: 'err.mobileTaken' } : { 401: 'err.wrongLogin', 429: 'err.locked', 400: 'err.wrongLogin' }),
      );
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? 'login' : 'register');
    setTried(false);
    setError(null);
  };

  return (
    <View style={styles.flex}>
      <Screen
        footer={
          <>
            <Button
              label={busy ? t('common.saving') : isRegister ? t('login.registerBtn') : t('login.loginBtn')}
              onPress={submit}
              disabled={busy}
            />
            <Button label={isRegister ? t('login.toLogin') : t('login.toRegister')} variant="ghost" small onPress={switchMode} disabled={busy} />
          </>
        }>
        <View style={styles.langs} accessibilityRole="radiogroup">
          {LANGUAGES.map(l => {
            const on = l.key === state.language;
            return (
              <Pressable
                key={l.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={l.en}
                onPress={() => setLanguage(l.key)}
                style={[styles.lang, { borderColor: on ? colors.primary : colors.line, backgroundColor: on ? colors.primarySoft : colors.surface }]}>
                <T variant="bodyMedium" color={on ? colors.primary : colors.ink2}>
                  {l.native}
                </T>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.hero}>
          <LogoLockup width={180} ground={isDark ? 'dark' : 'light'} />
          <T variant="screenTitle" style={styles.center}>
            {isRegister ? t('login.registerTitle') : t('login.title')}
          </T>
          <T variant="supporting" color={colors.ink2} style={styles.center}>
            {isRegister ? t('login.registerSubtitle') : t('login.subtitle')}
          </T>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {isRegister ? (
          <>
            <TextField
              label={t('login.shopName')}
              value={shopName}
              onChangeText={setShopName}
              autoCapitalize="words"
              maxLength={60}
              error={tried ? errors.shopName : undefined}
            />
            <TextField
              label={t('login.yourName')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              maxLength={60}
              error={tried ? errors.name : undefined}
            />
          </>
        ) : null}
        <TextField
          label={t('login.mobile')}
          value={mobile}
          onChangeText={v => setMobile(v.replace(/\D/g, ''))}
          prefix="+91"
          keyboardType="number-pad"
          maxLength={10}
          error={tried ? errors.mobile : undefined}
        />
        <TextField
          label={t('login.passcode')}
          value={passcode}
          onChangeText={v => setPasscode(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          help={isRegister ? t('login.passcodeHelp') : undefined}
          error={tried ? errors.passcode : undefined}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: space[2], paddingTop: space[4] },
  langs: { flexDirection: 'row', justifyContent: 'center', gap: space[2] },
  lang: { minHeight: 40, paddingHorizontal: space[3], borderWidth: 1, borderRadius: radii.pill, justifyContent: 'center' },
});
