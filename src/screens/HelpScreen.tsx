import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { T } from '../components/Text';
import { StringKey, useT } from '../i18n';
import { useRouter } from '../navigation/Router';
import { space, useTheme } from '../theme';

const FAQ: { q: StringKey; a: StringKey }[] = [
  { q: 'help.q1', a: 'help.a1' },
  { q: 'help.q2', a: 'help.a2' },
  { q: 'help.q3', a: 'help.a3' },
  { q: 'help.q4', a: 'help.a4' },
  { q: 'help.q5', a: 'help.a5' },
];

export function HelpScreen() {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen
      header={<AppHeader title={t('help.title')} onBack={router.back} />}
      footer={<Button label={t('help.feedback')} variant="secondary" onPress={() => Alert.alert(t('help.feedback'), t('help.feedbackSoon'))} />}>
      <Card padded={false}>
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <View key={f.q} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: on }} onPress={() => setOpen(on ? null : i)} style={styles.q}>
                <T variant="bodyMedium" style={styles.flex}>
                  {t(f.q)}
                </T>
                <View style={{ transform: [{ rotate: on ? '90deg' : '0deg' }] }}>
                  <Icon name="chevronRight" size={20} color={colors.ink2} />
                </View>
              </Pressable>
              {on ? (
                <T variant="body" color={colors.ink2} style={styles.a}>
                  {t(f.a)}
                </T>
              ) : null}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  q: { minHeight: 56, paddingHorizontal: space[4], paddingVertical: space[3], flexDirection: 'row', alignItems: 'center', gap: space[3] },
  a: { paddingHorizontal: space[4], paddingBottom: space[4] },
});
