/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { api, ApiError, setUnauthorizedHandler } from '../src/api/client';
import { errorText, translate } from '../src/i18n';
import { en, hi, te } from '../src/i18n/strings';
import { formatINR, rupees } from '../src/logic/money';
import { AppStoreProvider, customerStatus, useStore } from '../src/store/AppStore';

// ---------- fake backend ----------

type Call = { url: string; method: string; body: any; auth?: string };
let calls: Call[] = [];
let respond: (c: Call) => { status: number; body?: unknown } | 'network';

const shop = {
  id: 'shop1',
  shopName: 'Test Kirana',
  shopkeeperName: 'Ravi',
  mobileNumber: '9876543210',
  language: 'en',
  todaysBill: 0,
  weeklyBill: 0,
  todaysDues: 0,
  duesTotal: 50000,
};
const ramesh = {
  id: 'c1',
  shopkeeperId: 'shop1',
  customerName: 'Ramesh',
  phoneNumber: '9000000011',
  isWalkinCustomer: false,
  pastDues: 50000,
  dueSince: new Date().toISOString(),
  recentTransactions: [],
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  calls = [];
  respond = () => ({ status: 500 });
  (globalThis as any).fetch = jest.fn(async (url: string, init: any) => {
    const call: Call = {
      url: url.replace(/^https?:\/\/[^/]+\/api/, ''),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body,
      auth: init?.headers?.Authorization,
    };
    calls.push(call);
    const r = respond(call);
    if (r === 'network') {
      throw new TypeError('Network request failed');
    }
    return { ok: r.status < 400, status: r.status, json: async () => r.body ?? null };
  });
});

const flush = () => ReactTestRenderer.act(async () => {
  await new Promise<void>(r => setTimeout(r, 0));
});

async function setup() {
  const ref: { current: ReturnType<typeof useStore> | null } = { current: null };
  function Probe() {
    ref.current = useStore();
    return null;
  }
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(
      <AppStoreProvider>
        <Probe />
      </AppStoreProvider>,
    );
  });
  await flush();
  return () => ref.current as ReturnType<typeof useStore>;
}

// ---------- tests ----------

test('formats Indian rupees', () => {
  expect(formatINR(rupees(125000))).toBe('₹1,25,000');
  expect(formatINR(rupees(490), { sign: true })).toBe('+ ₹490');
});

test('every Telugu and Hindi string keeps the same {placeholders} as English', () => {
  const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect([key, holes(te[key])]).toEqual([key, holes(en[key])]);
    expect([key, holes(hi[key])]).toEqual([key, holes(en[key])]);
  }
  expect(translate('te', 'home.greet', { name: 'Ravi' })).toBe('నమస్కారం, Ravi గారు');
  expect(translate('hi', 'khata.all', { count: 3 })).toBe('सभी 3');
});

test('errors become one sentence in the chosen language', () => {
  const t = (k: any, p?: any) => translate('te', k, p);
  expect(errorText(t, new ApiError('network', 0, 'x'))).toBe(te['err.noInternet']);
  expect(errorText(t, new ApiError('http', 401, 'x'), { 401: 'err.wrongLogin' })).toBe(te['err.wrongLogin']);
  expect(errorText(t, new ApiError('http', 503, 'x'))).toBe(te['err.server']);
  expect(errorText(t, new Error('boom'))).toBe(te['err.generic']);
});

test('api client: network failure and 401 handling', async () => {
  respond = () => 'network';
  await expect(api.me('tok')).rejects.toMatchObject({ kind: 'network' });

  const onUnauthorized = jest.fn();
  setUnauthorizedHandler(onUnauthorized);
  respond = () => ({ status: 401, body: { error: 'Session expired' } });
  await expect(api.me('tok')).rejects.toMatchObject({ kind: 'http', status: 401 });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  // A wrong passcode (no token sent) must not log anybody out.
  await expect(api.login('9876543210', '0000')).rejects.toMatchObject({ status: 401 });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
  setUnauthorizedHandler(null);
});

test('login, load data, save a khata bill, then session expiry', async () => {
  respond = c => {
    if (c.url === '/auth/login') {
      return { status: 200, body: { token: 'tok123', shopkeeper: shop } };
    }
    if (c.url === '/shopkeeper/me' && c.method === 'GET') {
      return { status: 200, body: { shopkeeper: shop } };
    }
    if (c.url === '/shopkeeper/me' && c.method === 'PATCH') {
      return { status: 200, body: { shopkeeper: { ...shop, ...c.body } } };
    }
    if (c.url === '/customers') {
      return { status: 200, body: { customers: [ramesh] } };
    }
    if (c.url === '/transactions') {
      const amount = c.body.items.reduce((s: number, i: any) => s + Math.round(i.qty * i.rate), 0);
      return {
        status: 201,
        body: {
          transaction: { ...c.body, amount },
          customer: {
            ...ramesh,
            pastDues: ramesh.pastDues + amount,
            recentTransactions: [{ txnId: c.body.txnId, kind: 'bill', method: 'khata', amount, items: c.body.items, createdAt: new Date().toISOString() }],
          },
          shopkeeper: { ...shop, todaysBill: amount, todaysDues: amount, duesTotal: shop.duesTotal + amount },
        },
      };
    }
    return { status: 404 };
  };

  const s = await setup();
  expect(s().state.booted).toBe(true);
  expect(s().state.token).toBeNull();

  ReactTestRenderer.act(() => s().onboard('te'));
  await ReactTestRenderer.act(() => s().login('9876543210', '1234'));
  await flush();
  expect(s().state.token).toBe('tok123');
  expect(s().customers.map(c => c.name)).toEqual(['Ramesh']);
  // The app's language (te) is pushed to the server for speech-to-text hints.
  expect(calls.some(c => c.method === 'PATCH' && c.body.language === 'te')).toBe(true);

  const draft = s().newDraft({ customerId: 'c1', items: [{ id: 'x', name: 'Rice', qty: 2, unit: 'kg', rate: rupees(60) }] });
  await ReactTestRenderer.act(() => s().saveBill(draft, 'khata'));
  const sent = calls.find(c => c.url === '/transactions');
  expect(sent?.body).toMatchObject({ kind: 'bill', txnId: draft.id, customerId: 'c1', method: 'khata', items: [{ name: 'Rice', qty: 2, unit: 'kg', rate: 6000 }] });
  expect(sent?.auth).toBe('Bearer tok123');
  const c1 = s().customerById('c1');
  expect(c1?.balance).toBe(50000 + 12000);
  expect(c1 && customerStatus(c1)).toBe('due');
  expect(s().state.shop?.todaysBill).toBe(12000);
  expect(s().txns[0]).toMatchObject({ id: draft.id, amount: 12000, customerId: 'c1' });

  // Server says the token is no longer valid → logged out with a message.
  respond = () => ({ status: 401, body: { error: 'Session expired' } });
  await ReactTestRenderer.act(() => s().refresh());
  expect(s().state.token).toBeNull();
  expect(s().state.sessionExpired).toBe(true);
});

test('language, login and data survive an app restart', async () => {
  respond = c => {
    if (c.url === '/auth/login') {
      return { status: 200, body: { token: 'tokR', shopkeeper: shop } };
    }
    if (c.url === '/shopkeeper/me') {
      return { status: 200, body: { shopkeeper: { ...shop, language: c.method === 'PATCH' ? c.body.language : 'hi' } } };
    }
    if (c.url === '/customers') {
      return { status: 200, body: { customers: [ramesh] } };
    }
    return { status: 404 };
  };
  const first = await setup();
  ReactTestRenderer.act(() => first().onboard('en'));
  await ReactTestRenderer.act(() => first().login('9876543210', '1234'));
  await flush();
  ReactTestRenderer.act(() => first().setLanguage('hi'));
  await flush();

  // A second store instance = the app opened again (same phone storage).
  calls = [];
  const second = await setup();
  await flush();
  expect(second().state.language).toBe('hi');
  expect(second().state.onboarded).toBe(true);
  expect(second().state.token).toBe('tokR');
  expect(second().customers.map(c => c.name)).toEqual(['Ramesh']);
  // It must not push a different language back to the server.
  expect(calls.some(c => c.method === 'PATCH')).toBe(false);
});

test('a failed save throws and changes nothing', async () => {
  respond = c => {
    if (c.url === '/auth/login') {
      return { status: 200, body: { token: 'tok', shopkeeper: { ...shop, language: 'te' } } };
    }
    if (c.url === '/shopkeeper/me') {
      return { status: 200, body: { shopkeeper: { ...shop, language: 'te' } } };
    }
    if (c.url === '/customers') {
      return { status: 200, body: { customers: [ramesh] } };
    }
    return 'network';
  };
  const s = await setup();
  await ReactTestRenderer.act(() => s().login('9876543210', '1234'));
  await flush();
  const draft = s().newDraft({ customerId: 'c1', items: [{ id: 'x', name: 'Rice', qty: 1, unit: 'kg', rate: 6000 }] });
  let error: unknown;
  await ReactTestRenderer.act(async () => {
    await s()
      .saveBill(draft, 'khata')
      .catch(e => {
        error = e;
      });
  });
  expect(error).toMatchObject({ kind: 'network' });
  expect(s().customerById('c1')?.balance).toBe(50000);
  expect(s().txns).toHaveLength(0);
});
