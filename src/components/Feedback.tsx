import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { radii, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

/** Red inline message with an optional "Try again". Used for every failed request. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  const t = useT();
  return (
    <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.dangerSoft, borderColor: colors.danger }]}>
      <Icon name="warning" size={20} color={colors.danger} />
      <T variant="bodyMedium" color={colors.danger} style={styles.flex}>
        {message}
      </T>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} hitSlop={8} style={styles.retry}>
          <T variant="bodyMedium" color={colors.primary}>
            {t('common.retry')}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Full-screen spinner with a caption (app start, first load). */
export function LoadingState({ label }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? (
        <T variant="supporting" color={colors.ink2}>
          {label}
        </T>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { borderWidth: 1, borderRadius: radii.sm, paddingHorizontal: space[3], paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  retry: { minHeight: size.touchMin - 8, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[3] },
});
