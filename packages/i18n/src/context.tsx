import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { Locale } from './locale.js';
import { DEFAULT_LOCALE } from './locale.js';
import { getDirection, type Direction } from './direction.js';
import { TranslationEngine, type TranslationEngineOptions } from './engine.js';

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  direction: Direction;
  t: (key: string, params?: Record<string, string>) => string;
  engine: TranslationEngine;
}

export interface I18nProviderProps {
  locale?: Locale;
  supportedLocales?: readonly Locale[];
  fallbackLocale?: Locale;
  dictionaries: Record<string, Record<string, Record<string, string>>>;
  onMissing?: (key: string, locale: string) => void;
  children: ReactNode;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale: initialLocale = DEFAULT_LOCALE,
  supportedLocales = ['en'] as readonly Locale[],
  fallbackLocale = DEFAULT_LOCALE,
  dictionaries,
  onMissing,
  children,
}: I18nProviderProps): JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const engine = useMemo(() => {
    const opts: TranslationEngineOptions = {
      locales: supportedLocales,
      fallbackLocale,
      onMissing,
    };
    return new TranslationEngine(opts);
  }, [supportedLocales, fallbackLocale, onMissing]);

  useMemo(() => {
    for (const [localeKey, namespaces] of Object.entries(dictionaries)) {
      for (const [namespace, data] of Object.entries(namespaces)) {
        engine.loadNamespace(namespace, localeKey, data);
      }
    }
  }, [engine, dictionaries]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = getDirection(locale);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem('open-edu-locale', newLocale);
    } catch {
      // SSR or storage unavailable
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('open-edu-locale');
      if (stored && (supportedLocales as readonly string[]).includes(stored)) {
        setLocaleState(stored as Locale);
      }
    } catch {
      // SSR or storage unavailable
    }
  }, [supportedLocales]);

  const direction = useMemo(() => getDirection(locale), [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string>) => engine.t(key, locale, params),
    [engine, locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, direction, t, engine }),
    [locale, setLocale, direction, t, engine]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
