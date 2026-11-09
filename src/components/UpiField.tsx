import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useT } from '../i18n';
import { UPI_SUFFIXES, upiApp, upiStatus, withSuffix } from '../logic/upi';
import { radii, size, space, type, useTheme } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

/**
 * The UPI ID box used at sign-up, on the UPI screen and in the bill's "add UPI" sheet.
 * Checked as the shopkeeper types: a missing "@bank" part offers one-tap endings,
 * a good ID shows a tick and the app it belongs to.
 */
export function UpiField({ value, onChangeText, autoFocus }: { value: string; onChangeText: (v: string) => void; autoFocus?: boolean }) {
  const { colors } = useTheme();
  const t = useT();
  const [focused, setFocused] = React.useState(false);
  const status = upiStatus(value);
  const app = upiApp(value);
  const bad = status === 'noAt' || status === 'invalid';
  const border = status === 'valid' ? colors.success : bad && !focused ? colors.danger : focused ? colors.primary : colors.lineStrong;

  return (
    <View style={styles.field}>
      <T variant="caption" color={colors.ink2} style={styles.label}>
        {t('upi.label')}
      </T>
      <View style={[styles.box, { borderColor: border, borderWidth: focused || status !== 'empty' ? 2 : 1, backgroundColor: colors.surface }]}>
        <TextInput
          accessibilityLabel={t('upi.label')}
          value={value}
          onChangeText={onChangeText}
          placeholder="name@ybl"
          placeholderTextColor={colors.ink2}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoFocus={autoFocus}
          maxLength={100}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[type.sectionTitle, styles.input, { color: colors.ink }]}
        />
        {status === 'valid' ? <Icon name="check" size={22} color={colors.success} strokeWidth={2.6} /> : null}
      </View>

      {status === 'valid' ? (
        <T variant="supporting" color={colors.successText} style={styles.bold}>
          {app ? t('upi.looksRightApp', { app }) : t('upi.looksRight')}
        </T>
      ) : status === 'noAt' ? (
        <>
          <T variant="supporting" color={colors.danger} style={styles.bold}>
            {t('upi.addEnding')}
          </T>
          <View style={styles.chips}>
            {UPI_SUFFIXES.map(s => (
              <Pressable
                key={s.suffix}
                accessibilityRole="button"
                accessibilityLabel={`@${s.suffix} ${s.app}`}
                onPress={() => onChangeText(withSuffix(value, s.suffix))}
                style={({ pressed }) => [styles.chip, { borderColor: colors.lineStrong, backgroundColor: pressed ? colors.surfaceMuted : colors.surface }]}>
                <T variant="bodyMedium">@{s.suffix}</T>
                <T variant="supporting" color={colors.ink2}>
                  {s.app}
                </T>
              </Pressable>
            ))}
          </View>
        </>
      ) : status === 'invalid' ? (
        <T variant="supporting" color={colors.danger} style={styles.bold}>
          {t('prof.errUpi')}
        </T>
      ) : (
        <T variant="supporting" color={colors.ink2}>
          {t('upi.help')}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[2] },
  label: { letterSpacing: 0.4 },
  bold: { fontWeight: '600' },
  box: { minHeight: size.touchMin + 16, borderRadius: radii.md, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  input: { flex: 1, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { minHeight: 40, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: 6 },
});
