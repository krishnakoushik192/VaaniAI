import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { duration, radii, size, useTheme } from '../theme';
import { Icon, IconName } from './Icon';
import { T } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onPremium';

type Props = {
  label: string;
  te?: string;
  onPress?: () => void;
  variant?: Variant;
  small?: boolean;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

/** Verb-first label, 56px (48px small). Press: 0.98 scale + tonal change in 150ms. */
export function Button({
  label,
  te,
  onPress,
  variant = 'primary',
  small,
  icon,
  disabled,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.timing(scale, { toValue: v, duration: duration.fast, useNativeDriver: true }).start();

  const palette = {
    primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.onPrimary, te: colors.primarySoft, border: 'transparent' },
    secondary: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.ink, te: colors.ink2, border: colors.lineStrong },
    ghost: { bg: 'transparent', pressed: colors.primarySoft, fg: colors.primary, te: colors.primary, border: 'transparent' },
    onPremium: { bg: 'transparent', pressed: 'rgba(255,255,255,0.08)', fg: colors.onPremium, te: colors.premiumMuted, border: colors.premiumMuted },
  }[variant];

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={te ? `${label}, ${te}` : label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: small ? size.buttonHSm : size.buttonH,
            backgroundColor: pressed ? palette.pressed : palette.bg,
            borderColor: palette.border,
            opacity: disabled ? 0.5 : 1,
          },
        ]}>
        {icon ? <Icon name={icon} size={20} color={palette.fg} /> : null}
        <View style={styles.labels}>
          <T variant="button" color={palette.fg}>
            {label}
          </T>
          {te ? (
            <T variant="teLine" color={palette.te}>
              {te}
            </T>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  labels: { alignItems: 'center', gap: 2 },
});
