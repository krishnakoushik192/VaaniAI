// Invented demo data. The shop, customers, phone numbers and UPI ID are not real.
import { BillItem, rupees } from '../logic/money';

export type Language = 'te' | 'en' | 'hi';

export type Profile = {
  shopName: string;
  ownerName: string;
  phone: string;
  upiId: string;
  language: Language;
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  balance: number; // paise; > 0 means the customer owes the shop
  dueSince?: number; // ms timestamp of the oldest unpaid credit
  createdAt: number;
};

export type PaymentMethod = 'cash' | 'upi' | 'khata';

export type Txn = {
  id: string; // client-generated: saving twice never duplicates
  kind: 'bill' | 'payment';
  customerId: string | null;
  amount: number; // paise
  method: PaymentMethod; // bill + khata = unpaid credit
  createdAt: number;
  billNo?: string;
  items?: BillItem[];
  discount?: number;
};

const DAY = 24 * 60 * 60 * 1000;
const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};

export function seedState() {
  const now = Date.now();
  const profile: Profile = {
    shopName: 'Sri Lakshmi Kirana',
    ownerName: 'Ravi Kumar',
    phone: '9000000001',
    upiId: 'srilakshmi.kirana@upi',
    language: 'te',
  };
  const customers: Customer[] = [
    { id: 'c1', name: 'Ramesh', phone: '9000000011', balance: rupees(1570), dueSince: now - 6 * DAY, createdAt: now - 90 * DAY },
    { id: 'c2', name: 'Lakshmi Devi', phone: '9000000012', balance: rupees(2300), dueSince: now - 40 * DAY, createdAt: now - 120 * DAY },
    { id: 'c3', name: 'Koushik', phone: '9000000013', balance: rupees(250), dueSince: now - 3 * DAY, createdAt: now - 60 * DAY },
    { id: 'c4', name: 'Suresh Babu', phone: '9000000014', balance: 0, createdAt: now - 200 * DAY },
    { id: 'c5', name: 'Anitha', phone: '9000000015', balance: rupees(640), dueSince: now - 10 * DAY, createdAt: now - 30 * DAY },
    { id: 'c6', name: 'Venkat Rao', phone: '9000000016', balance: rupees(3120), dueSince: now - 36 * DAY, createdAt: now - 300 * DAY },
  ];
  const txns: Txn[] = [
    { id: 't1', kind: 'bill', customerId: 'c1', amount: rupees(320), method: 'khata', createdAt: at(0, 10, 15), billNo: '#0217' },
    { id: 't2', kind: 'bill', customerId: null, amount: rupees(860), method: 'cash', createdAt: at(0, 9, 40), billNo: '#0216' },
    { id: 't3', kind: 'payment', customerId: 'c5', amount: rupees(200), method: 'upi', createdAt: at(0, 9, 20) },
    { id: 't4', kind: 'bill', customerId: 'c3', amount: rupees(410), method: 'upi', createdAt: at(0, 8, 55), billNo: '#0215' },
    { id: 't5', kind: 'payment', customerId: 'c4', amount: rupees(800), method: 'cash', createdAt: at(1, 18, 30) },
    { id: 't6', kind: 'bill', customerId: 'c3', amount: rupees(250), method: 'khata', createdAt: at(3, 19, 5), billNo: '#0201' },
    { id: 't7', kind: 'bill', customerId: 'c5', amount: rupees(840), method: 'khata', createdAt: at(10, 11, 0), billNo: '#0170' },
  ];
  return {
    onboarded: false,
    profile,
    customers,
    txns,
    nextBillNo: 219,
    settings: {
      fingerprint: true,
      offline: false,
      lastBackup: at(0, 7, 30) as number | null,
    },
  };
}

/** What the extractor might return for the sample transcript. */
export const sampleExtraction: { customerId: string; transcript: string; items: BillItem[] } = {
  customerId: 'c3',
  transcript: 'Koushik garu, rendu kilo biyyam, oka litre nune, aradzan guddlu, oka kilo kandi pappu, oka kilo chakkera.',
  items: [
    { id: 'i1', name: 'Rice', qty: 2, unit: 'kg', rate: rupees(60) },
    { id: 'i2', name: 'Sunflower oil', qty: 1, unit: 'L', rate: rupees(180) },
    { id: 'i3', name: 'Eggs', qty: 6, unit: 'pc', rate: rupees(7), needsCheck: true, note: 'Check rate' },
    { id: 'i4', name: 'Toor dal', qty: 1, unit: 'kg', rate: rupees(100) },
    { id: 'i5', name: 'Sugar', qty: 1, unit: 'kg', rate: rupees(48) },
  ],
};
