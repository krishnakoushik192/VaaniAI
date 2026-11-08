import React, { createContext, useCallback, useContext } from 'react';
import { ApiError, isApiError } from '../api/client';
import type { Language } from '../data/types';
import { en, hi, StringKey, te } from './strings';

export type { StringKey };
export type Params = Record<string, string | number>;
export type TFn = (key: StringKey, params?: Params) => string;

const DICTS = { en, te, hi } as const;

export const LANGUAGES: { key: Language; native: string; en: string }[] = [
  { key: 'te', native: 'తెలుగు', en: 'Telugu' },
  { key: 'en', native: 'English', en: 'English' },
  { key: 'hi', native: 'हिन्दी', en: 'Hindi' },
];

export function translate(lang: Language, key: StringKey, params?: Params): string {
  const text: string = DICTS[lang][key] ?? en[key] ?? key; // unknown key (e.g. a new unit) → shown as is
  return params ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : text;
}

const LanguageContext = createContext<Language>('en');

export function LanguageProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);

/** `const t = useT(); t('home.greet', { name })` — text in the shop's chosen language. */
export function useT(): TFn {
  const lang = useLanguage();
  return useCallback((key: StringKey, params?: Params) => translate(lang, key, params), [lang]);
}

/**
 * Turns any error into one sentence in the user's language.
 * `overrides` maps HTTP status codes to a more specific message for that screen
 * (e.g. 401 on the login screen means "wrong passcode", not "session expired").
 */
export function errorText(t: TFn, err: unknown, overrides: Partial<Record<number, StringKey>> = {}): string {
  if (!isApiError(err)) {
    return t('err.generic');
  }
  const e: ApiError = err;
  if (e.kind === 'network') {
    return t('err.noInternet');
  }
  if (e.kind === 'timeout') {
    return t('err.timeout');
  }
  const specific = overrides[e.status];
  if (specific) {
    return t(specific);
  }
  if (e.status === 401) {
    return t('err.sessionExpired');
  }
  if (e.status === 404) {
    return t('err.notFound');
  }
  if (e.status === 400 || e.status === 409 || e.status === 422) {
    return t('err.invalid');
  }
  if (e.status >= 500) {
    return t('err.server');
  }
  return t('err.generic');
}
