import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, size, useTheme } from '../theme';
import { T } from './Text';

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.key)}
            style={[
              styles.seg,
              { backgroundColor: on ? colors.surface : 'transparent', borderColor: on ? colors.primary : 'transparent' },
            ]}>
            <T variant="bodyMedium" color={on ? colors.primary : colors.ink2} style={{ fontWeight: '700' }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Filter pills (All / Due / Overdue). */
export function Pills<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" style={styles.pills}>
      {options.map(o => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={[
              styles.pill,
              { backgroundColor: on ? colors.primarySoft : colors.surface, borderColor: on ? colors.primary : colors.lineStrong },
            ]}>
            <T variant="bodyMedium" color={on ? colors.primary : colors.ink}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radii.md, padding: 4, gap: 4 },
  seg: { flex: 1, minHeight: size.touchMin, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 16, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
