import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Customer, Language, PaymentMethod, Profile, seedState, Txn } from '../data/sample';
import { BillItem, billTotals, clientId } from '../logic/money';

// Frontend-only demo store. Everything lives in memory; swap the reducer's
// side for API calls + local DB later. Screens use only the hooks below.

export type BillDraft = {
  id: string; // client id: retries never duplicate a bill
  number: string;
  customerId: string | null;
  transcript?: string;
  items: BillItem[];
  discount: number;
  method?: PaymentMethod; // preferred method (Add credit → khata)
};

export type AppState = ReturnType<typeof seedState>;
export type Settings = AppState['settings'];

type Action =
  | { type: 'onboard'; language: Language }
  | { type: 'profile'; patch: Partial<Profile> }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'addCustomer'; customer: Customer; openingDue: number }
  | { type: 'saveBill'; draft: BillDraft; method: PaymentMethod; at: number }
  | { type: 'payment'; id: string; customerId: string; amount: number; method: PaymentMethod; at: number }
  | { type: 'reset' };

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'onboard':
      return { ...s, onboarded: true, profile: { ...s.profile, language: a.language } };
    case 'profile':
      return { ...s, profile: { ...s.profile, ...a.patch } };
    case 'settings':
      return { ...s, settings: { ...s.settings, ...a.patch } };
    case 'addCustomer': {
      const c = a.openingDue > 0 ? { ...a.customer, balance: a.openingDue, dueSince: a.customer.createdAt } : a.customer;
      return { ...s, customers: [c, ...s.customers] };
    }
    case 'saveBill': {
      if (s.txns.some(t => t.id === a.draft.id)) {
        return s; // idempotent
      }
      const { total } = billTotals(a.draft.items, a.draft.discount);
      const txn: Txn = {
        id: a.draft.id,
        kind: 'bill',
        customerId: a.draft.customerId,
        amount: total,
        method: a.method,
        createdAt: a.at,
        billNo: a.draft.number,
        items: a.draft.items,
        discount: a.draft.discount,
      };
      const customers =
        a.method === 'khata' && a.draft.customerId
          ? s.customers.map(c =>
              c.id === a.draft.customerId ? { ...c, balance: c.balance + total, dueSince: c.dueSince ?? a.at } : c,
            )
          : s.customers;
      return { ...s, txns: [txn, ...s.txns], customers, nextBillNo: s.nextBillNo + 1 };
    }
    case 'payment': {
      if (s.txns.some(t => t.id === a.id)) {
        return s;
      }
      const txn: Txn = { id: a.id, kind: 'payment', customerId: a.customerId, amount: a.amount, method: a.method, createdAt: a.at };
      const customers = s.customers.map(c => {
        if (c.id !== a.customerId) {
          return c;
        }
        const balance = c.balance - a.amount;
        return { ...c, balance, dueSince: balance > 0 ? c.dueSince : undefined };
      });
      return { ...s, txns: [txn, ...s.txns], customers };
    }
    case 'reset':
      return { ...seedState(), onboarded: true };
  }
}

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);

  const onboard = useCallback((language: Language) => dispatch({ type: 'onboard', language }), []);
  const updateProfile = useCallback((patch: Partial<Profile>) => dispatch({ type: 'profile', patch }), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => dispatch({ type: 'settings', patch }), []);
  const resetDemo = useCallback(() => dispatch({ type: 'reset' }), []);

  const addCustomer = useCallback((input: { name: string; phone?: string; openingDue?: number }) => {
    const customer: Customer = { id: clientId('cust'), name: input.name.trim(), phone: input.phone || undefined, balance: 0, createdAt: Date.now() };
    dispatch({ type: 'addCustomer', customer, openingDue: input.openingDue ?? 0 });
    return customer.id;
  }, []);

  const saveBill = useCallback((draft: BillDraft, method: PaymentMethod) => {
    dispatch({ type: 'saveBill', draft, method, at: Date.now() });
  }, []);

  const recordPayment = useCallback((customerId: string, amount: number, method: PaymentMethod, id = clientId('pay')) => {
    dispatch({ type: 'payment', id, customerId, amount, method, at: Date.now() });
  }, []);

  const newDraft = useCallback(
    (init: Partial<BillDraft> = {}): BillDraft => ({
      id: clientId('bill'),
      number: `#${String(state.nextBillNo).padStart(4, '0')}`,
      customerId: null,
      items: [],
      discount: 0,
      ...init,
    }),
    [state.nextBillNo],
  );

  const customerById = useCallback((id: string | null | undefined) => state.customers.find(c => c.id === id), [state.customers]);

  return useMemo(
    () => ({ state, onboard, updateProfile, updateSettings, resetDemo, addCustomer, saveBill, recordPayment, newDraft, customerById }),
    [state, onboard, updateProfile, updateSettings, resetDemo, addCustomer, saveBill, recordPayment, newDraft, customerById],
  );
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
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

export const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();

export function todaySummary(txns: Txn[]) {
  const today = txns.filter(t => isToday(t.createdAt));
  const bills = today.filter(t => t.kind === 'bill');
  const sales = bills.reduce((s, t) => s + t.amount, 0);
  const due = bills.filter(t => t.method === 'khata').reduce((s, t) => s + t.amount, 0);
  const received =
    bills.filter(t => t.method !== 'khata').reduce((s, t) => s + t.amount, 0) +
    today.filter(t => t.kind === 'payment').reduce((s, t) => s + t.amount, 0);
  return { sales, due, received, bills: bills.length };
}

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

const METHOD_LABEL: Record<PaymentMethod, string> = { cash: 'Cash', upi: 'Online · UPI', khata: 'Khata' };
export const methodLabel = (m: PaymentMethod) => METHOD_LABEL[m];
