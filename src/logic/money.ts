// "Code counts the money." The LLM only extracts names, quantities, units and
// spoken amounts; every total, due and amount-to-pay is computed here.
// All money is kept in paise (integers) to avoid floating-point drift.

export type Paise = number;

export const rupees = (r: number): Paise => Math.round(r * 100);

/** ₹1,25,000 — Indian digit grouping. Drops ".00", keeps real paise. */
export function formatINR(p: Paise, opts: { sign?: boolean } = {}): string {
  const neg = p < 0;
  const abs = Math.abs(p);
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const s = String(whole);
  let grouped = s;
  if (s.length > 3) {
    const last3 = s.slice(-3);
    const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    grouped = `${rest},${last3}`;
  }
  const body = `₹${grouped}${frac ? `.${String(frac).padStart(2, '0')}` : ''}`;
  if (opts.sign) {
    return `${neg ? '− ' : '+ '}${body}`;
  }
  return neg ? `− ${body}` : body;
}

export type BillItem = {
  id: string;
  name: string;
  qty: number;
  unit: string; // kg, L, pc
  rate: Paise; // per unit
  needsCheck?: boolean; // uncertain extraction: never saved silently
  note?: string;
};

export const lineTotal = (i: BillItem): Paise => Math.round(i.qty * i.rate);

export function billTotals(items: BillItem[], discount: Paise = 0) {
  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const total = Math.max(0, subtotal - discount);
  const needsCheck = items.filter(i => i.needsCheck).length;
  return { subtotal, discount, total, needsCheck, count: items.length };
}

/** Client-generated unique id: retries are idempotent and never duplicate a bill. */
export function clientId(prefix = 'bill'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function upiUri(params: { vpa: string; payee: string; amount: Paise; note?: string }) {
  const q = [
    `pa=${encodeURIComponent(params.vpa)}`,
    `pn=${encodeURIComponent(params.payee)}`,
    `am=${(params.amount / 100).toFixed(2)}`,
    'cu=INR',
    params.note ? `tn=${encodeURIComponent(params.note)}` : '',
  ].filter(Boolean);
  return `upi://pay?${q.join('&')}`;
}
