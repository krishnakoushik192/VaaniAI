// The bill as an invoice page (HTML), turned into a PDF on the phone and shared.
// Android's WebView draws it, so Telugu and Hindi item names are shaped correctly.
import type { PaymentMethod, Shop } from '../data/types';
import type { TFn } from '../i18n';
import { BillItem, billTotals, formatINR, lineTotal } from './money';

export type SavedBill = {
  id: string;
  number: string; // "#0042"
  items: BillItem[];
  discount: number;
  method: PaymentMethod;
  customerName: string | null; // null = walk-in
  customerId: string | null;
  customerPhone: string | null; // 10 digits, for sending the invoice on WhatsApp
  savedAt: number;
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function dateTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'am' : 'pm'}`;
}

/** "invoice-sri-lakshmi-kirana-0042" (letters, digits and dashes only, for the PDF file name). */
export function invoiceFileName(shopName: string, billNumber: string) {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return ['invoice', slug(shopName) || 'shop', slug(billNumber) || 'bill'].join('-');
}

/** The invoice page. `qtyText` writes a quantity with its unit ("2 kg") in the app's language. */
export function invoiceHtml(opts: { t: TFn; shop: Shop; bill: SavedBill; qtyText: (i: BillItem) => string; unitText: (i: BillItem) => string }) {
  const { t, shop, bill } = opts;
  const { subtotal, total } = billTotals(bill.items, bill.discount);
  const paid =
    bill.method === 'khata' ? t('inv.onKhata') : bill.method === 'upi' ? t('inv.paidUpi') : t('inv.paidCash');
  const rows = bill.items
    .map(
      i => `<tr>
        <td class="name">${esc(i.name)}</td>
        <td class="num">${esc(opts.qtyText(i))}</td>
        <td class="num">${esc(formatINR(i.rate))}<span class="unit"> / ${esc(opts.unitText(i))}</span></td>
        <td class="num strong">${esc(formatINR(lineTotal(i)))}</td>
      </tr>`,
    )
    .join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px 40px; font-family: 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', Roboto, sans-serif; color: #151922; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1769e0; padding-bottom: 14px; }
  .shop { font-size: 22px; font-weight: 800; margin: 0; }
  .muted { color: #5d6679; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #5d6679; text-transform: uppercase; }
  .title { font-size: 16px; font-weight: 800; color: #1769e0; text-align: right; }
  .meta { display: flex; justify-content: space-between; margin: 16px 0 10px; gap: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { text-align: left; font-size: 10px; letter-spacing: 1px; color: #5d6679; border-bottom: 1px solid #dde3ee; padding: 8px 4px; }
  td { padding: 9px 4px; border-bottom: 1px solid #eef2f8; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .unit { color: #5d6679; font-size: 11px; }
  .strong { font-weight: 700; }
  .totals { margin-left: auto; width: 55%; margin-top: 12px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 4px; }
  .grand { border-top: 2px solid #151922; margin-top: 4px; padding-top: 8px !important; font-size: 18px; font-weight: 800; }
  .paid { display: inline-block; margin-top: 14px; padding: 5px 12px; border-radius: 999px; background: ${bill.method === 'khata' ? '#fff5df' : '#e8f7ef'}; color: ${bill.method === 'khata' ? '#8f5c0f' : '#12703f'}; font-weight: 700; }
  .foot { margin-top: 28px; text-align: center; color: #5d6679; font-size: 11px; }
</style></head>
<body>
  <div class="head">
    <div>
      <p class="shop">${esc(shop.shopName)}</p>
      <div class="muted">${esc(shop.shopkeeperName)} · +91 ${esc(shop.mobileNumber)}</div>
      ${shop.upiId ? `<div class="muted">UPI: ${esc(shop.upiId)}</div>` : ''}
    </div>
    <div class="title">${esc(t('inv.title'))}<div class="muted" style="font-size:12px;font-weight:600">${esc(bill.number)}</div></div>
  </div>
  <div class="meta">
    <div><div class="label">${esc(t('inv.billTo'))}</div><div class="strong">${esc(bill.customerName ?? t('common.walkIn'))}</div></div>
    <div style="text-align:right"><div class="label">${esc(t('inv.date'))}</div><div>${esc(dateTime(bill.savedAt))}</div></div>
  </div>
  <table>
    <thead><tr><th>${esc(t('review.colItem'))}</th><th class="num">${esc(t('review.colQty'))}</th><th class="num">${esc(t('inv.rate'))}</th><th class="num">${esc(t('review.colAmount'))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    ${bill.discount ? `<div><span>${esc(t('inv.subtotal'))}</span><span>${esc(formatINR(subtotal))}</span></div><div><span>${esc(t('review.discount'))}</span><span>− ${esc(formatINR(bill.discount))}</span></div>` : ''}
    <div class="grand"><span>${esc(t('review.total'))}</span><span>${esc(formatINR(total))}</span></div>
  </div>
  <div style="text-align:right"><span class="paid">${esc(paid)}</span></div>
  <div class="foot">${esc(t('inv.thanks'))}<br>${esc(t('inv.madeWith'))}</div>
</body></html>`;
}
