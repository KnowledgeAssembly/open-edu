import type { Locale } from './locale.js';

export function formatDate(date: Date, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    ...options,
  }).format(value);
}

export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string = 'INR',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}
