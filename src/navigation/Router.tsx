import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, StyleSheet } from 'react-native';
import type { TabKey } from '../components/BottomNav';
import type { PaymentMethod } from '../data/types';
import type { BillDraft } from '../store/AppStore';
import { duration } from '../theme';

// A small dependency-free stack navigator. Swap for @react-navigation/native-stack
// later without touching screens: they only use `useRouter()`.

export type { BillDraft, PaymentMethod };

export type ResultKind = 'paid' | 'khata' | 'payment';

export type Route =
  | { name: 'tabs'; tab: TabKey }
  | { name: 'recorder' }
  | { name: 'review'; draft: BillDraft }
  | { name: 'editItems'; draft: BillDraft; fromReview?: boolean }
  | { name: 'payment'; draft: BillDraft; total: number }
  | { name: 'cashConfirm'; draft: BillDraft; total: number }
  | { name: 'result'; kind: ResultKind; amount: number; customerId: string | null; method: PaymentMethod }
  | { name: 'customer'; id: string }
  | { name: 'addCustomer' }
  | { name: 'recordPayment'; customerId?: string }
  | { name: 'settings' }
  | { name: 'editProfile' }
  | { name: 'help' };

type Entry = { key: number; route: Route };

type RouterValue = {
  route: Route;
  push: (r: Route) => void;
  replace: (r: Route) => void;
  /** Pop the top screen and replace the one under it (Edit items → updated Review). */
  popAndReplace: (r: Route) => void;
  back: () => void;
  reset: (tab?: TabKey) => void;
  /** Home underneath, `r` on top. Used after a save: Back goes Home, not into the finished flow. */
  resetTo: (r: Route) => void;
  setTab: (tab: TabKey) => void;
};

const Ctx = createContext<RouterValue | null>(null);

export function RouterProvider({ render }: { render: (r: Route) => React.ReactNode }) {
  const seq = useRef(0);
  const mk = useCallback((route: Route): Entry => ({ key: ++seq.current, route }), []);
  const [stack, setStack] = useState<Entry[]>(() => [mk({ name: 'tabs', tab: 'home' })]);
  const top = stack[stack.length - 1];

  const push = useCallback((r: Route) => setStack(s => [...s, mk(r)]), [mk]);
  const replace = useCallback((r: Route) => setStack(s => [...s.slice(0, -1), mk(r)]), [mk]);
  const popAndReplace = useCallback((r: Route) => setStack(s => (s.length > 1 ? [...s.slice(0, -2), mk(r)] : [mk(r)])), [mk]);
  const back = useCallback(() => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const reset = useCallback((tab: TabKey = 'home') => setStack([mk({ name: 'tabs', tab })]), [mk]);
  const resetTo = useCallback((r: Route) => setStack([mk({ name: 'tabs', tab: 'home' }), mk(r)]), [mk]);
  const setTab = reset;

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, back]);

  const value = useMemo(
    () => ({ route: top.route, push, replace, popAndReplace, back, reset, resetTo, setTab }),
    [top.route, push, replace, popAndReplace, back, reset, resetTo, setTab],
  );

  return (
    <Ctx.Provider value={value}>
      <FadeRise key={top.key}>{render(top.route)}</FadeRise>
    </Ctx.Provider>
  );
}

/** Screens fade and rise 6px in 220ms. */
function FadeRise({ children }: { children: React.ReactNode }) {
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: duration.base, useNativeDriver: true }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [6, 0] });
  return <Animated.View style={[styles.fill, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

export function useRouter(): RouterValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useRouter must be used inside RouterProvider');
  }
  return v;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
