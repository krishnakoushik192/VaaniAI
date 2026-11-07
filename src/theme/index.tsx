import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { ColorTokens, darkColors, lightColors } from './colors';

export * from './colors';
export * from './spacing';
export * from './typography';

type SchemePref = 'system' | 'light' | 'dark';

type ThemeValue = {
  colors: ColorTokens;
  isDark: boolean;
  shadows: {
    sheet: object;
    fab: object;
  };
  scheme: SchemePref;
  setScheme: (s: SchemePref) => void;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [scheme, setScheme] = useState<SchemePref>('system');
  const isDark = scheme === 'dark' || (scheme === 'system' && system === 'dark');

  const value = useMemo<ThemeValue>(() => {
    const colors = isDark ? darkColors : lightColors;
    return {
      colors,
      isDark,
      scheme,
      setScheme,
      shadows: {
        // The only two shadows in the system.
        sheet: {
          shadowColor: isDark ? '#000000' : '#111827',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: isDark ? 0.5 : 0.12,
          shadowRadius: 12,
          elevation: 12,
        },
        fab: {
          shadowColor: isDark ? '#000000' : colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.5 : 0.28,
          shadowRadius: 8,
          elevation: 6,
        },
      },
    };
  }, [isDark, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return v;
}
