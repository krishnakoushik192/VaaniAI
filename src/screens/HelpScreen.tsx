import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { AppHeader, Card, Screen } from '../components/Layout';
import { T } from '../components/Text';
import { useRouter } from '../navigation/Router';
import { space, useTheme } from '../theme';

const FAQ = [
  { q: 'How do I make a voice bill?', a: 'Tap Create bill with voice on Home. Say the customer name, then each item with quantity and price. Tap the blue button to stop, check the bill, and save.' },
  { q: 'What if Vaani hears an item wrong?', a: 'Items it is not sure about are highlighted. Tap the item to confirm it, or tap Edit items to change it. A bill with a highlighted item cannot be saved.' },
  { q: 'How do I add a bill to Khata?', a: 'On Review bill choose Khata, or tap Add to Khata on the payment screen. The amount is added to the customer’s due.' },
  { q: 'How do I record a payment?', a: 'Tap Record payment on Home, or open the customer in Khata and tap Record payment.' },
  { q: 'Does it work without internet?', a: 'Yes. Bills are saved on this phone and synced later with the same ID, so nothing is saved twice.' },
];

export function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Screen
      header={<AppHeader title="Help and support" te="సహాయం" onBack={router.back} />}
      footer={
        <Button
          label="Send feedback"
          variant="secondary"
          onPress={() => Alert.alert('Thank you', 'Your feedback was sent. (Demo)')}
        />
      }>
      <Card padded={false}>
        {FAQ.map((f, i) => {
          const on = open === i;
          return (
            <View key={f.q} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.line } : undefined}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                onPress={() => setOpen(on ? null : i)}
                style={styles.q}>
                <T variant="bodyMedium" style={styles.flex}>
                  {f.q}
                </T>
                <View style={{ transform: [{ rotate: on ? '90deg' : '0deg' }] }}>
                  <Icon name="chevronRight" size={20} color={colors.ink2} />
                </View>
              </Pressable>
              {on ? (
                <T variant="body" color={colors.ink2} style={styles.a}>
                  {f.a}
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
