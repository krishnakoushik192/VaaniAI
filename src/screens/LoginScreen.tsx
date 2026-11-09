import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/Feedback';
import { TextField } from '../components/Form';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Layout';
import { T } from '../components/Text';
import { UpiField } from '../components/UpiField';
import { errorText, LANGUAGES, useT } from '../i18n';
import { isValidUpi, normalizeUpi } from '../logic/upi';
import { useStore } from '../store/AppStore';
import { radii, size, space, type, useTheme } from '../theme';

const MOBILE_RE = /^[6-9]\d{9}$/;
const NEW_PIN_LENGTH = 4;

type Step = 'mobile' | 'passcode' | 'shop' | 'upi';

/**
 * Log in and sign up, one question per screen:
 *   mobile number → passcode → (new shops only) shop details → UPI ID
 * The app asks the server whether the number has an account, so nobody has to pick
 * "log in" or "create account". A new shop is created only at the last step.
 */
export function LoginScreen() {
  const t = useT();
  const { state, checkMobile, login, register, chooseLanguageAgain } = useStore();
  const [step, setStep] = useState<Step>('mobile');
  const [exists, setExists] = useState(false);
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [upi, setUpi] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(state.sessionExpired ? t('err.sessionExpired') : null);

  const go = (s: Step) => {
    setStep(s);
    setTried(false);
    setError(null);
  };

  const back = () => {
    if (busy) {
      return;
    }
    if (step === 'mobile') {
      chooseLanguageAgain();
    } else if (step === 'passcode') {
      setPin('');
      go('mobile');
    } else if (step === 'shop') {
      go('passcode');
    } else {
      go('shop');
    }
  };

  // Android back button follows the same steps.
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const run = async (work: () => Promise<void>, overrides: Parameters<typeof errorText>[2] = {}) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(errorText(t, e, overrides));
    } finally {
      setBusy(false);
    }
  };

  const submitMobile = () => {
    setTried(true);
    if (!MOBILE_RE.test(mobile) || busy) {
      return;
    }
    run(async () => {
      const found = await checkMobile(mobile);
      setExists(found);
      setPin('');
      go('passcode');
    });
  };

  const submitPin = () => {
    setTried(true);
    const ok = exists ? /^\d{4,6}$/.test(pin) : pin.length === NEW_PIN_LENGTH;
    if (!ok || busy) {
      return;
    }
    if (!exists) {
      go('shop');
      return;
    }
    // Success: the app switches to Home by itself (the session is set).
    run(() => login(mobile, pin), { 401: 'err.wrongLogin', 429: 'err.locked', 400: 'err.wrongLogin' });
  };

  const submitShop = () => {
    setTried(true);
    if (shopName.trim().length < 2 || name.trim().length < 2) {
      return;
    }
    go('upi');
  };

  const finish = (withUpi: boolean) => {
    if (busy || (withUpi && !isValidUpi(upi))) {
      return;
    }
    run(
      () =>
        register({
          shopName: shopName.trim(),
          shopkeeperName: name.trim(),
          mobileNumber: mobile,
          passcode: pin,
          upiId: withUpi ? normalizeUpi(upi) : undefined,
        }),
      { 409: 'err.mobileTaken' },
    );
  };

  const lang = LANGUAGES.find(l => l.key === state.language);
  const header = <StepHeader onBack={back} dots={exists || step === 'mobile' ? 0 : step === 'passcode' ? 1 : step === 'shop' ? 2 : 3} right={step === 'mobile' ? lang?.native : undefined} onRight={chooseLanguageAgain} />;
  const banner = error ? <ErrorBanner message={error} /> : null;

  if (step === 'mobile') {
    return (
      <Screen header={header} footer={<Button label={busy ? t('auth.checking') : t('common.continue')} onPress={submitMobile} disabled={busy} />}>
        <Title title={t('auth.mobileTitle')} sub={t('auth.mobileSub')} />
        {banner}
        <TextField
          label={t('login.mobile')}
          value={mobile}
          onChangeText={v => setMobile(v.replace(/\D/g, ''))}
          prefix="+91"
          keyboardType="number-pad"
          maxLength={10}
          autoFocus
          error={tried && !MOBILE_RE.test(mobile) ? t('login.errMobile') : undefined}
        />
      </Screen>
    );
  }

  if (step === 'passcode') {
    const pinError = tried && (exists ? !/^\d{4,6}$/.test(pin) : pin.length !== NEW_PIN_LENGTH) ? t('login.errPasscode') : undefined;
    return (
      <Screen
        header={header}
        footer={<Button label={busy ? t('common.saving') : exists ? t('login.loginBtn') : t('common.continue')} onPress={submitPin} disabled={busy} />}>
        {!exists ? <NewNumberBanner text={t('auth.newNumber')} /> : null}
        <Title
          title={exists ? t('auth.welcomeBack') : t('auth.createPin')}
          sub={exists ? t('auth.enterPinFor', { mobile: `+91 ${mobile}` }) : t('auth.createPinSub', { mobile: `+91 ${mobile}` })}
        />
        {banner}
        <PinBoxes
          value={pin}
          length={exists ? Math.min(6, Math.max(4, pin.length + (pin.length < 6 ? 1 : 0))) : NEW_PIN_LENGTH}
          max={exists ? 6 : NEW_PIN_LENGTH}
          onChange={setPin}
          label={exists ? t('login.passcode') : t('auth.createPin')}
        />
        <HelpText text={pinError ?? (exists ? t('auth.pinLength') : t('auth.pinHint'))} danger={!!pinError} />
      </Screen>
    );
  }

  if (step === 'shop') {
    return (
      <Screen header={header} footer={<Button label={t('common.continue')} onPress={submitShop} />}>
        <Title title={t('auth.shopTitle')} sub={t('auth.shopSub')} />
        <TextField
          label={t('login.shopName')}
          value={shopName}
          onChangeText={setShopName}
          autoCapitalize="words"
          maxLength={60}
          autoFocus
          error={tried && shopName.trim().length < 2 ? t('login.errShopName') : undefined}
        />
        <TextField
          label={t('login.yourName')}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          maxLength={60}
          error={tried && name.trim().length < 2 ? t('login.errName') : undefined}
        />
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <>
          <Button label={busy ? t('common.saving') : t('auth.saveFinish')} onPress={() => finish(true)} disabled={busy || !isValidUpi(upi)} />
          <Button label={t('auth.skipForNow')} variant="ghost" small onPress={() => finish(false)} disabled={busy} />
        </>
      }>
      <Title title={t('auth.upiTitle')} sub={t('auth.upiSub')} />
      {banner}
      <UpiField value={upi} onChangeText={setUpi} autoFocus />
    </Screen>
  );
}

function StepHeader({ onBack, dots, right, onRight }: { onBack: () => void; dots: number; right?: string; onRight: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={onBack}
        style={({ pressed }) => [styles.round, { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
        <Icon name="back" size={20} color={colors.ink} />
      </Pressable>
      {dots ? (
        <View style={styles.dots} accessibilityLabel={t('auth.stepOf', { n: dots, total: 3 })}>
          {[1, 2, 3].map(n => (
            <View key={n} style={[styles.dot, { backgroundColor: n <= dots ? colors.primary : colors.line }]} />
          ))}
        </View>
      ) : right ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('set.language')} onPress={onRight} hitSlop={12} style={styles.langBtn}>
          <Icon name="language" size={18} color={colors.ink2} />
          <T variant="bodyMedium" color={colors.ink2}>
            {right}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

function Title({ title, sub }: { title: string; sub: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.title}>
      <T variant="screenTitle" style={styles.big}>
        {title}
      </T>
      <T variant="body" color={colors.ink2}>
        {sub}
      </T>
    </View>
  );
}

function NewNumberBanner({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
      <Icon name="check" size={18} color={colors.successText} strokeWidth={2.4} />
      <T variant="bodyMedium" color={colors.successText} style={styles.flex}>
        {text}
      </T>
    </View>
  );
}

function HelpText({ text, danger }: { text: string; danger: boolean }) {
  const { colors } = useTheme();
  return (
    <T variant="supporting" color={danger ? colors.danger : colors.ink2} style={styles.center}>
      {text}
    </T>
  );
}

/** Digit boxes over one hidden number field: tapping anywhere opens the keypad. */
function PinBoxes({ value, length, max, onChange, label }: { value: string; length: number; max: number; onChange: (v: string) => void; label: string }) {
  const { colors } = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable accessibilityRole="none" onPress={() => input.current?.focus()} style={styles.pins}>
      {Array.from({ length }, (_, i) => {
        const filled = i < value.length;
        const current = i === value.length;
        return (
          <View
            key={i}
            style={[styles.pin, { backgroundColor: colors.surface, borderColor: current ? colors.primary : colors.line, borderWidth: current ? 2 : 1 }]}>
            {filled ? <View style={[styles.pinDot, { backgroundColor: colors.ink }]} /> : null}
          </View>
        );
      })}
      <TextInput
        ref={input}
        accessibilityLabel={label}
        value={value}
        onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, max))}
        keyboardType="number-pad"
        secureTextEntry
        autoFocus
        maxLength={max}
        caretHidden
        style={[type.body, styles.hiddenInput]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  big: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  header: { height: size.headerH, paddingHorizontal: space[5], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 24, height: 6, borderRadius: radii.pill },
  langBtn: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { gap: space[2], paddingTop: space[2] },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space[2], borderRadius: 12, paddingHorizontal: 14, paddingVertical: space[3] },
  pins: { flexDirection: 'row', justifyContent: 'center', gap: space[3], paddingTop: space[2] },
  pin: { width: 56, height: 64, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 14, height: 14, borderRadius: radii.pill },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
