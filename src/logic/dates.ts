import type { TFn } from '../i18n';

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}

const months = (t: TFn) => t('date.months').split(',');
const days = (t: TFn) => t('date.days').split(',');

export function dayLabel(t: TFn, ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) {
    return t('date.today');
  }
  if (d.toDateString() === y.toDateString()) {
    return t('date.yesterday');
  }
  return `${d.getDate()} ${months(t)[d.getMonth()]}`;
}

export const shortDate = (t: TFn, ts: number) => {
  const d = new Date(ts);
  return `${days(t)[d.getDay()]}, ${d.getDate()} ${months(t)[d.getMonth()]}`;
};

export const whenLabel = (t: TFn, ts: number) => `${dayLabel(t, ts)}, ${timeLabel(ts)}`;

/** 75 → "01:15" */
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
