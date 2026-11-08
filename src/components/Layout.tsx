import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { radii, size, space, useTheme } from '../theme';
import { Icon } from './Icon';
import { T } from './Text';

const FIELD_MARGIN = 56; // room below the focused field for its help or error line

/** True while the on-screen keyboard is open. */
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Screen: AppHeader → scrolling content → footer pinned at the thumb.
 * Keyboard-aware: the screen shrinks above the keyboard (the footer's Save button stays
 * visible), the focused text field is scrolled into view, and the tab bar hides while typing.
 * Works with Android edge-to-edge, where the system no longer resizes the window.
 */
export function Screen({
  header,
  footer,
  children,
  scroll = true,
  bottomNav,
  refreshing,
  onRefresh,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
  bottomNav?: React.ReactNode;
  /** Pull-to-refresh (scrolling screens only). */
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardVisible();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const revealRef = useRef<() => void>(() => {});
  const keyboardOpenRef = useRef(false);
  keyboardOpenRef.current = keyboardOpen;

  // Once the keyboard is up and the layout has shrunk, bring the focused field into view.
  useEffect(() => {
    if (!scroll) {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = (_e?: KeyboardEvent) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const input = TextInput.State.currentlyFocusedInput();
        const view = scrollRef.current;
        if (!input || !view) {
          return;
        }
        view.measureInWindow((_vx, vy, _vw, vh) => {
          input.measureInWindow((_ix, iy, _iw, ih) => {
            const below = iy + ih + FIELD_MARGIN - (vy + vh);
            const above = vy + FIELD_MARGIN - iy;
            if (below > 0) {
              view.scrollTo({ y: offset.current + below, animated: true });
            } else if (above > 0) {
              view.scrollTo({ y: Math.max(0, offset.current - above), animated: true });
            }
          });
        });
      }, 120);
    };
    revealRef.current = reveal;
    const sub = Keyboard.addListener('keyboardDidShow', reveal);
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [scroll]);

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.flex, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {header}
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={e => {
            offset.current = e.nativeEvent.contentOffset.y;
          }}
          // Tapping another field while the keyboard is already open: no new keyboard event on Android.
          onTouchEnd={() => {
            if (keyboardOpenRef.current) {
              revealRef.current();
            }
          }}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> : undefined
          }>
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View style={[styles.flex, styles.content]}>{children}</View>
        </View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: keyboardOpen ? space[3] : bottomNav ? space[3] : Math.max(insets.bottom, space[4]) + space[2] },
          ]}>
          {footer}
        </View>
      ) : null}
      {keyboardOpen ? null : bottomNav}
    </KeyboardAvoidingView>
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
  const t = useT();
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={close ? t('common.close') : t('common.back')}
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
