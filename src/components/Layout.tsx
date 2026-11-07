import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

/** Screen: AppHeader → scrolling content → footer pinned at the thumb. */
export function Screen({
  header,
  footer,
  children,
  scroll = true,
  bottomNav,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  bottomNav?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;
  return (
    <View style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {header}
      <Body
        style={styles.flex}
        {...(scroll
          ? { contentContainerStyle: styles.content, keyboardShouldPersistTaps: 'handled' as const }
          : {})}>
        {scroll ? children : <View style={[styles.flex, styles.content]}>{children}</View>}
      </Body>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: bottomNav ? space[3] : Math.max(insets.bottom, space[4]) + space[2] }]}>
          {footer}
        </View>
      ) : null}
      {bottomNav}
    </View>
  );
}

export function AppHeader({
  title,
  te,
  onBack,
  close,
  right,
}: {
  title: string;
  te?: string;
  onBack?: () => void;
  close?: boolean;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={close ? 'Close' : 'Back'}
          hitSlop={4}
          style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Icon name={close ? 'close' : 'back'} size={22} color={colors.ink} />
        </Pressable>
      ) : (
        <View style={{ width: space[2] }} />
      )}
      <View style={styles.flex}>
        <T variant="sectionTitle" numberOfLines={1}>
          {title}
        </T>
        {te ? (
          <T variant="teLine" color={colors.ink2}>
            {te}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radii.md, overflow: 'hidden' },
        padded && { padding: space[5] },
        style,
      ]}>
      {children}
    </View>
  );
}

export function IconButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; label: string; onPress?: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.roundBtn,
        { borderColor: colors.line, backgroundColor: pressed ? colors.surfaceMuted : colors.surface },
      ]}>
      <Icon name={icon} size={20} color={colors.ink} />
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space[5], paddingTop: space[3], paddingBottom: space[6], gap: space[5] },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[3] },
  header: { height: size.headerH, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space[3] },
  iconBtn: { width: size.touchMin, height: size.touchMin, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  roundBtn: {
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
