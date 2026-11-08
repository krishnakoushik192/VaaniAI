import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { api, ApiError, isApiError, ServerCustomer, setUnauthorizedHandler, toCustomer, toShop, toTxns } from '../api/client';
import type { Customer, Language, PaymentMethod, Shop, Txn } from '../data/types';
import { LanguageProvider, TFn } from '../i18n';
import { BillItem, clientId } from '../logic/money';

// App state backed by the Vaani API. Screens only use the hooks/functions below.
// Writes go to the server first; the screen shows an error if that fails, so
// nothing is ever shown as saved when it is not.

export type BillDraft = {
  id: string; // client id = server txnId: retries never duplicate a bill
  number: string;
  customerId: string | null;
  transcript?: string;
  spokenCustomerName?: string; // voice: a name that matched no customer
  spokenLanguage?: string; // voice: language Gnani detected, e.g. te-IN (for reading it back)
  spoken?: boolean; // voice conversation already read the bill aloud: Review does not read it again
  items: BillItem[];
  discount: number;
  method?: PaymentMethod; // preferred method (Add credit → khata)
};

export type SyncStatus = 'idle' | 'loading' | 'ok' | 'error';
export type Settings = { fingerprint: boolean; readBack: boolean };

type State = {
  booted: boolean;
  onboarded: boolean;
  language: Language;
  token: string | null;
  shop: Shop | null;
  serverCustomers: ServerCustomer[]; // includes the walk-in customer (for its transactions)
  settings: Settings;
  nextBillNo: number;
  sync: { status: SyncStatus; error: ApiError | null };
  sessionExpired: boolean;
};

const initialState: State = {
  booted: false,
  onboarded: false,
  language: 'te',
  token: null,
  shop: null,
  serverCustomers: [],
  settings: { fingerprint: false, readBack: true },
  nextBillNo: 1,
  sync: { status: 'idle', error: null },
  sessionExpired: false,
};

type Action =
  | { type: 'boot'; patch: Partial<State> }
  | { type: 'language'; language: Language }
  | { type: 'onboard'; language: Language }
  | { type: 'loggedIn'; token: string; shop: Shop }
  | { type: 'logout'; expired: boolean }
  | { type: 'syncStart' }
  | { type: 'syncOk'; shop: Shop; customers: ServerCustomer[] | null }
  | { type: 'syncFail'; error: ApiError | null }
  | { type: 'shop'; shop: Shop }
  | { type: 'upsertCustomer'; customer: ServerCustomer; shop?: Shop }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'billNo' };

function upsert(list: ServerCustomer[], c: ServerCustomer) {
  const i = list.findIndex(x => x.id === c.id);
  return i === -1 ? [c, ...list] : list.map(x => (x.id === c.id ? c : x));
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'boot':
      return { ...s, ...a.patch, booted: true };
    case 'language':
      return { ...s, language: a.language };
    case 'onboard':
      return { ...s, onboarded: true, language: a.language };
    case 'loggedIn':
      return { ...s, token: a.token, shop: a.shop, serverCustomers: [], sessionExpired: false, sync: { status: 'idle', error: null } };
    case 'logout':
      return { ...s, token: null, shop: null, serverCustomers: [], sessionExpired: a.expired, sync: { status: 'idle', error: null } };
    case 'syncStart':
      return { ...s, sync: { status: 'loading', error: null } };
    case 'syncOk':
      return { ...s, shop: a.shop, serverCustomers: a.customers ?? s.serverCustomers, sync: { status: 'ok', error: null } };
    case 'syncFail':
      return { ...s, sync: { status: 'error', error: a.error } };
    case 'shop':
      return { ...s, shop: a.shop };
    case 'upsertCustomer':
      return { ...s, serverCustomers: upsert(s.serverCustomers, a.customer), shop: a.shop ?? s.shop };
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'billNo':
      return { ...s, nextBillNo: s.nextBillNo + 1 };
  }
}

// ---------- persistence ----------

const K = {
  onboarded: 'vaani.onboarded',
  language: 'vaani.language',
  token: 'vaani.token',
  shop: 'vaani.shop',
  customers: 'vaani.customers',
  settings: 'vaani.settings',
  billNo: 'vaani.nextBillNo',
};

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function loadPersisted(): Promise<Partial<State>> {
  try {
    const v = await AsyncStorage.getMany(Object.values(K));
    const savedLang = v[K.language];
    const language: Language | null = savedLang === 'te' || savedLang === 'en' || savedLang === 'hi' ? savedLang : null;
    return {
      onboarded: v[K.onboarded] === 'true',
      ...(language && { language }),
      token: v[K.token] || null,
      shop: parse<Shop | null>(v[K.shop], null),
      serverCustomers: parse<ServerCustomer[]>(v[K.customers], []),
      settings: { ...initialState.settings, ...parse<Partial<Settings>>(v[K.settings], {}) },
      nextBillNo: parse<number>(v[K.billNo], 1),
    };
  } catch {
    return {}; // storage unreadable: start fresh rather than crash
  }
}

const save = (key: string, value: unknown) => {
  const write = value === null || value === undefined ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  write.catch(() => {}); // a failed cache write must never break the app
};

// ---------- store ----------

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const ref = useRef(state);
  ref.current = state;
  const mutations = useRef(0); // bumps on every write; a refresh started before a write is discarded
  const refreshing = useRef<Promise<void> | null>(null);

  // Boot: restore the session and cached data, then refresh from the server.
  useEffect(() => {
    let alive = true;
    loadPersisted().then(patch => {
      if (alive) {
        dispatch({ type: 'boot', patch });
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Persist (only after boot, so defaults never overwrite saved data).
  useEffect(() => {
    if (state.booted) {
      save(K.onboarded, String(state.onboarded));
      save(K.language, state.language);
    }
  }, [state.booted, state.onboarded, state.language]);
  useEffect(() => {
    if (state.booted) {
      save(K.token, state.token);
      save(K.shop, state.shop);
      save(K.customers, state.token ? state.serverCustomers : null);
    }
  }, [state.booted, state.token, state.shop, state.serverCustomers]);
  useEffect(() => {
    if (state.booted) {
      save(K.settings, state.settings);
      save(K.billNo, state.nextBillNo);
    }
  }, [state.booted, state.settings, state.nextBillNo]);

  // Any 401 on an authenticated call → back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => dispatch({ type: 'logout', expired: true }));
    return () => setUnauthorizedHandler(null);
  }, []);

  const requireToken = () => {
    const token = ref.current.token;
    if (!token) {
      throw new ApiError('http', 401, 'Not logged in');
    }
    return token;
  };

  /** Keep the server's language (used for speech-to-text hints) equal to the app's. */
  const syncLanguage = useCallback((token: string, shop: Shop) => {
    const lang = ref.current.language;
    if (shop.language !== lang) {
      api
        .updateMe(token, { language: lang })
        .then(r => dispatch({ type: 'shop', shop: toShop(r.shopkeeper) }))
        .catch(() => {}); // retried on the next refresh
    }
  }, []);

  const refresh = useCallback((): Promise<void> => {
    if (refreshing.current) {
      return refreshing.current;
    }
    const token = ref.current.token;
    if (!token) {
      return Promise.resolve();
    }
    const seq = mutations.current;
    dispatch({ type: 'syncStart' });
    const run = Promise.all([api.me(token), api.customers(token)])
      .then(([me, list]) => {
        if (ref.current.token !== token) {
          return; // logged out meanwhile
        }
        const shop = toShop(me.shopkeeper);
        // A bill saved while this refresh was running is newer than this list: keep ours.
        dispatch({ type: 'syncOk', shop, customers: seq === mutations.current ? list.customers : null });
        syncLanguage(token, shop);
      })
      .catch((e: unknown) => {
        dispatch({ type: 'syncFail', error: isApiError(e) ? e : null });
      })
      .finally(() => {
        refreshing.current = null;
      });
    refreshing.current = run;
    return run;
  }, [syncLanguage]);

  // Refresh once after boot / login.
  useEffect(() => {
    if (state.booted && state.token) {
      refresh();
    }
  }, [state.booted, state.token, refresh]);

  const setLanguage = useCallback((language: Language) => {
    dispatch({ type: 'language', language });
    const { token, shop } = ref.current;
    if (token && shop) {
      api
        .updateMe(token, { language })
        .then(r => dispatch({ type: 'shop', shop: toShop(r.shopkeeper) }))
        .catch(() => {});
    }
  }, []);

  const onboard = useCallback((language: Language) => dispatch({ type: 'onboard', language }), []);

  const login = useCallback(async (mobileNumber: string, passcode: string) => {
    const r = await api.login(mobileNumber, passcode);
    dispatch({ type: 'loggedIn', token: r.token, shop: toShop(r.shopkeeper) });
  }, []);

  const register = useCallback(async (input: { shopName: string; shopkeeperName: string; mobileNumber: string; passcode: string }) => {
    const r = await api.register({ ...input, language: ref.current.language });
    dispatch({ type: 'loggedIn', token: r.token, shop: toShop(r.shopkeeper) });
  }, []);

  const logout = useCallback(() => dispatch({ type: 'logout', expired: false }), []);

  const updateProfile = useCallback(async (patch: { shopName?: string; shopkeeperName?: string; upiId?: string }) => {
    const r = await api.updateMe(requireToken(), patch);
    dispatch({ type: 'shop', shop: toShop(r.shopkeeper) });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => dispatch({ type: 'settings', patch }), []);

  /** Creates the customer on the server and returns its id. */
  const addCustomer = useCallback(async (input: { name: string; phone?: string; openingDue?: number }) => {
    const token = requireToken();
    mutations.current++;
    const openingDue = input.openingDue ?? 0;
    const r = await api.addCustomer(token, { customerName: input.name.trim(), phoneNumber: input.phone || undefined, openingDue });
    const shop = ref.current.shop;
    dispatch({ type: 'upsertCustomer', customer: r.customer, shop: shop && openingDue ? { ...shop, duesTotal: shop.duesTotal + openingDue } : undefined });
    return r.customer.id;
  }, []);

  /** Saves a bill. Same draft.id twice = saved once (safe to retry). */
  const saveBill = useCallback(async (draft: BillDraft, method: PaymentMethod) => {
    const token = requireToken();
    mutations.current++;
    const r = await api.saveBill(token, {
      txnId: draft.id,
      customerId: draft.customerId ?? undefined,
      method,
      items: draft.items,
      discount: draft.discount,
      billNo: draft.number,
    });
    dispatch({ type: 'upsertCustomer', customer: r.customer, shop: toShop(r.shopkeeper) });
    dispatch({ type: 'billNo' });
  }, []);

  const recordPayment = useCallback(async (customerId: string, amount: number, method: 'cash' | 'upi', id: string) => {
    const token = requireToken();
    mutations.current++;
    const r = await api.recordPayment(token, { txnId: id, customerId, method, amount });
    dispatch({ type: 'upsertCustomer', customer: r.customer, shop: toShop(r.shopkeeper) });
  }, []);

  const newDraft = useCallback(
    (init: Partial<BillDraft> = {}): BillDraft => ({
      id: clientId('bill'),
      number: `#${String(ref.current.nextBillNo).padStart(4, '0')}`,
      customerId: null,
      items: [],
      discount: 0,
      ...init,
    }),
    [],
  );

  // Derived lists: named customers only (walk-in is hidden), and all recent transactions.
  const customers = useMemo<Customer[]>(
    () => state.serverCustomers.filter(c => !c.isWalkinCustomer).map(toCustomer),
    [state.serverCustomers],
  );
  const txns = useMemo<Txn[]>(
    () => state.serverCustomers.flatMap(toTxns).sort((a, b) => b.createdAt - a.createdAt),
    [state.serverCustomers],
  );
  const customerById = useCallback((id: string | null | undefined) => (id ? customers.find(c => c.id === id) : undefined), [customers]);

  return useMemo(
    () => ({
      state,
      customers,
      txns,
      refresh,
      setLanguage,
      onboard,
      login,
      register,
      logout,
      updateProfile,
      updateSettings,
      addCustomer,
      saveBill,
      recordPayment,
      newDraft,
      customerById,
    }),
    [state, customers, txns, refresh, setLanguage, onboard, login, register, logout, updateProfile, updateSettings, addCustomer, saveBill, recordPayment, newDraft, customerById],
  );
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return (
    <Ctx.Provider value={value}>
      <LanguageProvider language={value.state.language}>{children}</LanguageProvider>
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useStore must be used inside AppStoreProvider');
  }
  return v;
}

// ---------- selectors ----------

const OVERDUE_AFTER_DAYS = 30;

export type KhataStatus = 'due' | 'overdue' | 'settled';

export function customerStatus(c: Customer, now = Date.now()): KhataStatus {
  if (c.balance <= 0) {
    return 'settled';
  }
  if (c.dueSince && now - c.dueSince > OVERDUE_AFTER_DAYS * 24 * 60 * 60 * 1000) {
    return 'overdue';
  }
  return 'due';
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export const methodLabel = (t: TFn, m: PaymentMethod) => (m === 'cash' ? t('method.cash') : m === 'upi' ? t('method.upiLong') : t('method.khata'));
