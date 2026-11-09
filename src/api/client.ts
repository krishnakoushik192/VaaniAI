// Thin, typed wrapper around the Vaani backend. Every call either resolves with
// data or throws an ApiError — screens never see raw fetch errors.
import type { BillItem } from '../logic/money';
import type { Customer, Language, PaymentMethod, Shop, Txn } from '../data/types';
import { API_BASE_URL, REQUEST_TIMEOUT_MS, VOICE_TIMEOUT_MS } from './config';

// ---------- errors ----------

export type ApiErrorKind =
  | 'network' // no internet / server unreachable
  | 'timeout' // no answer in time
  | 'aborted' // cancelled by the app (screen closed)
  | 'http'; // the server answered with 4xx / 5xx

export class ApiError extends Error {
  constructor(
    public readonly kind: ApiErrorKind,
    public readonly status: number, // 0 unless kind === 'http'
    message: string, // the server's English message, for logs only
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

// Called when a request that carried a token gets 401 (token expired / account gone).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

// ---------- request core ----------

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  token?: string | null;
  json?: unknown;
  form?: FormData;
  timeoutMs?: number;
  signal?: AbortSignal;
};

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onOuterAbort);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }
  let body: string | FormData | undefined;
  if (opts.form) {
    body = opts.form; // fetch sets the multipart boundary itself
  } else if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.json);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: controller.signal,
    });
  } catch (e) {
    if (timedOut) {
      throw new ApiError('timeout', 0, `Timed out: ${path}`);
    }
    if (opts.signal?.aborted) {
      throw new ApiError('aborted', 0, `Cancelled: ${path}`);
    }
    throw new ApiError('network', 0, `Network error: ${(e as Error)?.message ?? e}`);
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onOuterAbort);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
    if (res.status === 401 && opts.token) {
      onUnauthorized?.();
    }
    throw new ApiError('http', res.status, message);
  }
  return data as T;
}

// ---------- server shapes ----------

type ServerShop = Shop & { createdAt?: string; updatedAt?: string };

type ServerTxn = {
  txnId: string;
  kind: 'bill' | 'payment';
  method: PaymentMethod;
  amount: number;
  billNo?: string;
  items?: { name: string; qty: number; unit?: string; rate: number }[];
  discount?: number;
  createdAt: string;
};

export type ServerCustomer = {
  id: string;
  shopkeeperId: string;
  customerName: string;
  phoneNumber?: string;
  isWalkinCustomer: boolean;
  pastDues: number;
  dueSince?: string;
  recentTransactions: ServerTxn[];
  createdAt: string;
};

export type DraftItem = {
  name: string;
  spokenName: string;
  qty: number;
  unit: string;
  rate: number | null; // null = price not heard
  lineTotal: number | null;
  needsCheck: boolean;
  notes: string[];
};

export type VoiceBillResponse = {
  transcript: string;
  detectedLanguage: string | null;
  truncated: boolean;
  draft: {
    spokenCustomerName: string | null;
    customer: { id: string; customerName: string; pastDues: number } | null;
    method: PaymentMethod | null;
    items: DraftItem[];
    discount: number;
    subtotal: number;
    total: number;
    needsCheck: number;
    warnings: string[];
  };
  timings: { sttMs: number; llmMs: number };
};

// ---------- mapping to app types ----------

const ms = (iso?: string) => (iso ? new Date(iso).getTime() : undefined);

export function toShop(s: ServerShop): Shop {
  return {
    id: s.id,
    shopName: s.shopName,
    shopkeeperName: s.shopkeeperName,
    mobileNumber: s.mobileNumber,
    upiId: s.upiId || undefined,
    language: s.language,
    todaysBill: s.todaysBill ?? 0,
    weeklyBill: s.weeklyBill ?? 0,
    todaysDues: s.todaysDues ?? 0,
    duesTotal: s.duesTotal ?? 0,
  };
}

export function toCustomer(c: ServerCustomer): Customer {
  return {
    id: c.id,
    name: c.customerName,
    phone: c.phoneNumber || undefined,
    balance: c.pastDues,
    dueSince: ms(c.dueSince),
    createdAt: ms(c.createdAt) ?? Date.now(),
  };
}

export function toTxns(c: ServerCustomer): Txn[] {
  return c.recentTransactions.map(t => ({
    id: t.txnId,
    kind: t.kind,
    customerId: c.isWalkinCustomer ? null : c.id,
    amount: t.amount,
    method: t.method,
    createdAt: ms(t.createdAt) ?? Date.now(),
    billNo: t.billNo,
    discount: t.discount,
    items: t.items?.map((i, n) => ({ id: `${t.txnId}_${n}`, name: i.name, qty: i.qty, unit: i.unit ?? 'pc', rate: i.rate })),
  }));
}

// ---------- endpoints ----------

type AuthResponse = { token: string; shopkeeper: ServerShop };
type TxnResponse = { transaction: ServerTxn; customer: ServerCustomer; shopkeeper: ServerShop };

export const api = {
  login: (mobileNumber: string, passcode: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', json: { mobileNumber, passcode } }),

  /** Whether this mobile number already has a shop: decides "enter passcode" vs "create passcode". */
  checkMobile: (mobileNumber: string) => request<{ exists: boolean }>('/auth/check', { method: 'POST', json: { mobileNumber } }),

  register: (input: { shopName: string; shopkeeperName: string; mobileNumber: string; passcode: string; language: Language; upiId?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', json: input }),

  me: (token: string) => request<{ shopkeeper: ServerShop }>('/shopkeeper/me', { token }),

  updateMe: (token: string, patch: Partial<Pick<Shop, 'shopName' | 'shopkeeperName' | 'upiId' | 'language'>>) =>
    request<{ shopkeeper: ServerShop }>('/shopkeeper/me', { method: 'PATCH', token, json: patch }),

  customers: (token: string) => request<{ customers: ServerCustomer[] }>('/customers', { token }),

  addCustomer: (token: string, input: { customerName: string; phoneNumber?: string; openingDue?: number }) =>
    request<{ customer: ServerCustomer }>('/customers', { method: 'POST', token, json: input }),

  updateCustomer: (token: string, id: string, patch: { phoneNumber?: string }) =>
    request<{ customer: ServerCustomer }>(`/customers/${id}`, { method: 'PATCH', token, json: patch }),

  saveBill: (
    token: string,
    input: { txnId: string; customerId?: string; method: PaymentMethod; items: BillItem[]; discount: number; billNo?: string },
  ) =>
    request<TxnResponse>('/transactions', {
      method: 'POST',
      token,
      json: {
        kind: 'bill',
        txnId: input.txnId,
        customerId: input.customerId,
        method: input.method,
        items: input.items.map(i => ({ name: i.name, qty: i.qty, unit: i.unit, rate: i.rate })),
        discount: input.discount,
        billNo: input.billNo,
      },
    }),

  recordPayment: (token: string, input: { txnId: string; customerId: string; method: 'cash' | 'upi'; amount: number }) =>
    request<TxnResponse>('/transactions', { method: 'POST', token, json: { kind: 'payment', ...input } }),

  /** Upload a recording (file:// URI) → transcript + bill draft. Saves nothing. */
  voiceBill: (token: string, fileUri: string, opts: { customerId?: string; signal?: AbortSignal } = {}) => {
    const form = new FormData();
    // React Native's FormData accepts { uri, name, type } for files.
    form.append('audio', { uri: fileUri, name: 'recording.aac', type: 'audio/aac' } as unknown as Blob);
    if (opts.customerId) {
      form.append('customerId', opts.customerId);
    }
    return request<VoiceBillResponse>('/voice/bill', {
      method: 'POST',
      token,
      form,
      timeoutMs: VOICE_TIMEOUT_MS,
      signal: opts.signal,
    });
  },
};

// ---------- voice conversation ----------

/** One line of the bill being built by voice. Money in paise; null = not said yet (the app asks). */
export type TurnItem = {
  id: string;
  name: string; // English
  localName: string; // in the app's language: shown, spoken and saved
  qty: number | null;
  unit: string;
  rate: number | null;
  lineAmount?: number | null;
  usualRate?: number | null;
  checked?: boolean; // the shopkeeper already picked this price in a "did you mean?" question
};

/** "Did you mean?": options[0] is what was heard, options[1] the likely other one. */
export type TurnCheck =
  | { kind: 'amount'; itemId: string; field: 'rate' | 'line'; options: [number, number] }
  | { kind: 'customer'; options: [string, string] };

export type TurnState = {
  items: TurnItem[];
  customerId: string | null;
  method: PaymentMethod | null;
  discount: number;
  question: { itemId: string; field: 'qty' | 'rate' } | null;
  check?: TurnCheck | null;
  customerChecked?: boolean;
};

export type TurnResponse = {
  heard: boolean;
  transcript: string;
  detectedLanguage?: string | null;
  state: TurnState;
  customer: { id: string; name: string; pastDues: number } | null;
  spokenCustomerName: string | null;
  totals: { subtotal: number; total: number };
  /** confirmed = the shopkeeper said "yes" to the read-back: save the bill. */
  reply: { kind: 'confirm' | 'question' | 'retry' | 'confirmed'; text: string };
};

/** POST /api/voice/turn: apply what the shopkeeper said (recording or typed text) to the bill. */
export function voiceTurn(
  token: string,
  input: { fileUri?: string; text?: string; choose?: 0 | 1; state: TurnState | null; language: Language; readAll?: boolean },
  signal?: AbortSignal,
) {
  if (input.fileUri) {
    const form = new FormData();
    form.append('audio', { uri: input.fileUri, name: 'recording.aac', type: 'audio/aac' } as unknown as Blob);
    if (input.state) {
      form.append('state', JSON.stringify(input.state)); // left out on the first turn = new bill
    }
    form.append('language', input.language);
    form.append('readAll', input.readAll ? 'true' : 'false');
    return request<TurnResponse>('/voice/turn', { method: 'POST', token, form, timeoutMs: VOICE_TIMEOUT_MS, signal });
  }
  return request<TurnResponse>('/voice/turn', {
    method: 'POST',
    token,
    json: { text: input.text, choose: input.choose, state: input.state, language: input.language, readAll: !!input.readAll },
    timeoutMs: VOICE_TIMEOUT_MS,
    signal,
  });
}

// ---------- read-aloud ----------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** UTF-8 → base64url, so Telugu/Hindi text stays short in a URL. */
export function toBase64Url(text: string): string {
  // encodeURIComponent yields the UTF-8 bytes as %XX (ASCII stays as is)
  const bytes: number[] = [];
  const enc = encodeURIComponent(text);
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === '%') {
      bytes.push(parseInt(enc.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(enc.charCodeAt(i));
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    const n = a * 65536 + b * 256 + c;
    out += B64[Math.floor(n / 262144) % 64]! + B64[Math.floor(n / 4096) % 64]!;
    if (i + 1 < bytes.length) {
      out += B64[Math.floor(n / 64) % 64]!;
    }
    if (i + 2 < bytes.length) {
      out += B64[n % 64]!;
    }
  }
  return out;
}

/** GET /api/voice/speak → MP3 of `text` read aloud (max 600 characters per request). */
export const speakUrl = (text: string, language?: string | null) =>
  `${API_BASE_URL}/voice/speak?t=${toBase64Url(text)}${language ? `&lang=${encodeURIComponent(language)}` : ''}`;
