import React from 'react';
import { StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import { type as t, useTheme } from '../theme';

type Variant = keyof typeof t;

export function T({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[t[variant], { color: color ?? colors.ink }, style]}>
      {children}
    </Text>
  );
}

/** English line first, Telugu line (te-line, ink-2) 2px under it on the same edge. Never truncate Telugu. */
export function Bi({
  en,
  te,
  variant = 'bodyMedium',
  color,
  teColor,
  align = 'left',
  style,
  numberOfLines,
}: {
  en: string;
  te?: string;
  variant?: Variant;
  color?: string;
  teColor?: string;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<ViewStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  const items = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <View style={[{ alignItems: items, gap: 2 }, style]}>
      <T variant={variant} color={color} numberOfLines={numberOfLines} style={{ textAlign: align }}>
        {en}
      </T>
      {te ? (
        <T variant="teLine" color={teColor ?? colors.ink2} style={{ textAlign: align }}>
          {te}
        </T>
      ) : null}
    </View>
  );
}
