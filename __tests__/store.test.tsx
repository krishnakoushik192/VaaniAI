/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { formatINR, rupees } from '../src/logic/money';
import { AppStoreProvider, customerStatus, useStore } from '../src/store/AppStore';

type Store = ReturnType<typeof useStore>;

function setup() {
  const ref: { current: Store | null } = { current: null };
  function Probe() {
    ref.current = useStore();
    return null;
  }
  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(
      <AppStoreProvider>
        <Probe />
      </AppStoreProvider>,
    );
  });
  return () => ref.current as Store;
}

test('formats Indian rupees', () => {
  expect(formatINR(rupees(125000))).toBe('₹1,25,000');
  expect(formatINR(rupees(490), { sign: true })).toBe('+ ₹490');
});

test('onboarding and editing shop + shopkeeper name', () => {
  const s = setup();
  expect(s().state.onboarded).toBe(false);
  ReactTestRenderer.act(() => s().onboard('en'));
  ReactTestRenderer.act(() => s().updateProfile({ shopName: 'Ganesh Stores', ownerName: 'Mahesh' }));
  expect(s().state.onboarded).toBe(true);
  expect(s().state.profile).toMatchObject({ shopName: 'Ganesh Stores', ownerName: 'Mahesh', language: 'en' });
});

test('khata bill raises due, payment settles it, saving twice is idempotent', () => {
  const s = setup();
  let id = '';
  ReactTestRenderer.act(() => {
    id = s().addCustomer({ name: 'Test Customer' });
  });
  const draft = s().newDraft({ customerId: id, items: [{ id: 'x', name: 'Rice', qty: 2, unit: 'kg', rate: rupees(60) }] });
  ReactTestRenderer.act(() => s().saveBill(draft, 'khata'));
  ReactTestRenderer.act(() => s().saveBill(draft, 'khata'));
  expect(s().customerById(id)?.balance).toBe(rupees(120));
  expect(s().state.txns.filter(t => t.id === draft.id)).toHaveLength(1);

  ReactTestRenderer.act(() => s().recordPayment(id, rupees(120), 'cash'));
  const c = s().customerById(id);
  expect(c?.balance).toBe(0);
  expect(c && customerStatus(c)).toBe('settled');
});
