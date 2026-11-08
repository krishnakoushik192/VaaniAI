import React from 'react';
import { KeyboardTypeOptions, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { radii, size, space, type, useTheme } from '../theme';
import { Icon, IconName } from './Icon';
import { Bi, T } from './Text';

/** Persistent label (+ Telugu), optional ₹ prefix / unit suffix, help or error. */
export function TextField({
  label,
  te,
  value,
  onChangeText,
  prefix,
  suffix,
  keyboardType,
  placeholder,
  help,
  error,
  warn,
  autoFocus,
  maxLength,
  autoCapitalize,
  secureTextEntry,
  editable = true,
}: {
  label: string;
  te?: string;
  value: string;
  onChangeText: (v: string) => void;
  prefix?: string;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  help?: string;
  error?: string;
  warn?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
  editable?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = React.useState(false);
  const border = error ? colors.danger : warn ? colors.warning : focused ? colors.primary : colors.lineStrong;
  return (
    <View style={styles.field}>
      <Bi en={label} te={te} variant="bodyMedium" />
      <View
        style={[
          styles.box,
          { borderColor: border, borderWidth: focused || error ? 2 : 1, backgroundColor: !editable ? colors.surfaceMuted : warn ? colors.warningSoft : colors.surface },
        ]}>
        {prefix ? (
          <T variant="body" color={colors.ink2}>
            {prefix}
          </T>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.ink2}
          autoFocus={autoFocus}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[type.body, styles.input, { color: editable ? colors.ink : colors.ink2 }]}
        />
        {suffix ? (
          <T variant="body" color={colors.ink2}>
            {suffix}
          </T>
        ) : null}
      </View>
      {error ? (
        <T variant="supporting" color={colors.danger}>
          {error}
        </T>
      ) : help ? (
        <T variant="supporting" color={colors.ink2}>
          {help}
        </T>
      ) : null}
    </View>
  );
}

/** A settings / list row: icon well, title + subtitle, trailing value or switch. Whole row is the target. */
export function SettingRow({
  icon,
  title,
  te,
  sub,
  value,
  onPress,
  toggle,
  onToggle,
  danger,
  first,
}: {
  icon: IconName;
  title: string;
  te?: string;
  sub?: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
  danger?: boolean;
  first?: boolean;
}) {
  const { colors } = useTheme();
  const isSwitch = toggle !== undefined;
  const tint = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityState={isSwitch ? { checked: toggle } : undefined}
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
      onPress={isSwitch ? () => onToggle?.(!toggle) : onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.line },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}>
      <View style={[styles.well, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon name={icon} size={20} color={tint} />
      </View>
      <View style={styles.flex}>
        <T variant="bodyMedium" color={danger ? colors.danger : colors.ink}>
          {title}
        </T>
        {te ? (
          <T variant="teLine" color={colors.ink2}>
            {te}
          </T>
        ) : null}
        {sub ? (
          <T variant="supporting" color={colors.ink2}>
            {sub}
          </T>
        ) : null}
      </View>
      {value ? (
        <T variant="supporting" color={colors.ink2} numberOfLines={1} style={styles.value}>
          {value}
        </T>
      ) : null}
      {isSwitch ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ true: colors.primary, false: colors.lineStrong }}
          thumbColor={colors.surface}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      ) : onPress ? (
        <Icon name="chevronRight" size={20} color={colors.ink2} />
      ) : null}
    </Pressable>
  );
}

export function EmptyState({
  icon,
  title,
  te,
  body,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  te?: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyWell, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name={icon} size={28} color={colors.ink2} />
      </View>
      <Bi en={title} te={te} variant="sectionTitle" align="center" />
      <T variant="supporting" color={colors.ink2} style={styles.center}>
        {body}
      </T>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.emptyAction} hitSlop={8}>
          <T variant="button" color={colors.primary}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <T variant="caption" color={colors.ink2} style={styles.section}>
      {children}
    </T>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  field: { gap: 6 },
  box: { minHeight: size.touchMin + 4, borderRadius: radii.sm, paddingHorizontal: space[3], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  input: { flex: 1, paddingVertical: 10 },
  row: { minHeight: 60, paddingHorizontal: space[4], paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: space[3] },
  well: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  value: { maxWidth: 140 },
  empty: { alignItems: 'center', gap: space[2], paddingVertical: space[8], paddingHorizontal: space[5] },
  emptyWell: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: space[2] },
  emptyAction: { minHeight: size.touchMin, justifyContent: 'center', paddingHorizontal: space[4] },
  section: { marginBottom: -space[3] },
});
