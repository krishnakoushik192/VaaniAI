// App-side data shapes. Money is always integer paise (₹1 = 100).
import type { BillItem } from '../logic/money';

export type Language = 'te' | 'en' | 'hi';

export type PaymentMethod = 'cash' | 'upi' | 'khata';

/** The logged-in shop (server: /api/shopkeeper/me). */
export type Shop = {
  id: string;
  shopName: string;
  shopkeeperName: string;
  mobileNumber: string;
  upiId?: string;
  language: Language;
  todaysBill: number; // all bills today (paise)
  weeklyBill: number; // all bills this week, Mon–Sun
  todaysDues: number; // new credit (khata) given today
  duesTotal: number; // what all customers owe right now
};

export type Customer = {
  id: string;
  name: string;
  phone?: string;
  balance: number; // paise; > 0 means the customer owes the shop
  dueSince?: number; // ms timestamp of the oldest unpaid credit
  createdAt: number;
};

/** One bill or payment. The server keeps the last 3 per customer. */
export type Txn = {
  id: string; // client-generated txnId: saving twice never duplicates
  kind: 'bill' | 'payment';
  customerId: string | null; // null = walk-in
  amount: number; // paise
  method: PaymentMethod; // bill + khata = unpaid credit
  createdAt: number;
  billNo?: string;
  items?: BillItem[];
  discount?: number;
};
