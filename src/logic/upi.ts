// UPI ID helpers: tidy what the shopkeeper typed, check it, and name the app it belongs to.

/** The common endings, offered as one-tap chips when the part after @ is missing. */
export const UPI_SUFFIXES: { suffix: string; app: string }[] = [
  { suffix: 'ybl', app: 'PhonePe' },
  { suffix: 'okaxis', app: 'GPay' },
  { suffix: 'paytm', app: 'Paytm' },
];

const APP_BY_SUFFIX: Record<string, string> = {
  ybl: 'PhonePe',
  ibl: 'PhonePe',
  axl: 'PhonePe',
  okaxis: 'GPay',
  okhdfcbank: 'GPay',
  okicici: 'GPay',
  oksbi: 'GPay',
  paytm: 'Paytm',
  ptyes: 'Paytm',
  pthdfc: 'Paytm',
  ptsbi: 'Paytm',
  ptaxis: 'Paytm',
};

const UPI_RE = /^[a-z0-9._-]{2,}@[a-z]{2,}$/;

/** Spaces removed and letters made small: "Ravi 98@YBL " → "ravi98@ybl". */
export const normalizeUpi = (raw: string) => raw.replace(/\s+/g, '').toLowerCase();

export const isValidUpi = (raw: string) => UPI_RE.test(normalizeUpi(raw));

/** "PhonePe" for 98480@ybl; null when the ending is not a well-known one. */
export function upiApp(raw: string): string | null {
  const at = normalizeUpi(raw).split('@')[1];
  return (at && APP_BY_SUFFIX[at]) || null;
}

/** "98480" + "ybl" → "98480@ybl" (replaces any ending already typed). */
export const withSuffix = (raw: string, suffix: string) => `${normalizeUpi(raw).split('@')[0]}@${suffix}`;

export type UpiStatus = 'empty' | 'noAt' | 'invalid' | 'valid';

export function upiStatus(raw: string): UpiStatus {
  const v = normalizeUpi(raw);
  if (!v) {
    return 'empty';
  }
  if (!v.includes('@') || v.endsWith('@')) {
    return 'noAt';
  }
  return UPI_RE.test(v) ? 'valid' : 'invalid';
}
