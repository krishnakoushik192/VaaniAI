import { translate } from '../src/i18n';
import { invoiceFileName, invoiceHtml, SavedBill } from '../src/logic/invoice';
import type { Shop } from '../src/data/types';

const shop: Shop = {
  id: 's1',
  shopName: 'Sri Lakshmi <Kirana>',
  shopkeeperName: 'Ravi Kumar',
  mobileNumber: '9848012345',
  upiId: 'ravi@ybl',
  language: 'te',
  todaysBill: 0,
  weeklyBill: 0,
  todaysDues: 0,
  duesTotal: 0,
};
const bill: SavedBill = {
  id: 'bill_1',
  number: '#0042',
  items: [
    { id: 'a', name: 'కందిపప్పు', qty: 1, unit: 'kg', rate: 7000 },
    { id: 'b', name: 'Oil', qty: 2, unit: 'L', rate: 7000 },
  ],
  discount: 1000,
  method: 'cash',
  customerName: null,
  customerId: null,
  customerPhone: null,
  savedAt: new Date(2026, 10, 9, 17, 30).getTime(),
};

describe('invoice', () => {
  const t = (k: Parameters<typeof translate>[1], p?: Record<string, string | number>) => translate('te', k, p);
  const html = invoiceHtml({ t, shop, bill, qtyText: i => `${i.qty} ${i.unit}`, unitText: i => i.unit });

  it('has the shop, the items in their own script, the totals and how it was paid', () => {
    expect(html).toContain('Sri Lakshmi &lt;Kirana&gt;'); // escaped
    expect(html).toContain('కందిపప్పు');
    expect(html).toContain('#0042');
    expect(html).toContain('09/11/2026, 5:30 pm');
    expect(html).toContain('₹210'); // 70 + 140
    expect(html).toContain('₹200'); // after ₹10 discount
    expect(html).toContain(translate('te', 'inv.paidCash'));
    expect(html).toContain('ravi@ybl');
  });

  it('makes a safe file name', () => {
    expect(invoiceFileName('Sri Lakshmi <Kirana>', '#0042')).toBe('invoice-sri-lakshmi-kirana-0042');
    expect(invoiceFileName('శ్రీ లక్ష్మి', '#0001')).toBe('invoice-shop-0001');
  });
});
