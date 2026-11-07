import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { size, useTheme } from '../theme';
import { Icon, IconName } from './Icon';
import { T } from './Text';

export type TabKey = 'home' | 'khata' | 'history';

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'khata', label: 'Khata', icon: 'khata' },
  { key: 'history', label: 'History', icon: 'history' },
];

/** Only on the three tab roots. */
export function BottomNav({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderTopColor: colors.line, paddingBottom: insets.bottom, height: size.tabbarH + insets.bottom },
      ]}>
      {TABS.map(tab => {
        const on = tab.key === active;
        const c = on ? colors.primary : colors.ink2;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={tab.label}
            onPress={() => onChange(tab.key)}
            style={styles.tab}>
            <Icon name={tab.icon} size={22} color={c} />
            <T variant="caption" color={c} style={{ letterSpacing: 0, fontWeight: on ? '700' : '600' }}>
              {tab.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: size.touchMin },
});
