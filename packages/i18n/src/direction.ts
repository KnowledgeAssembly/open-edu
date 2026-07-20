import type { Locale } from './locale.js';

export type Direction = 'ltr' | 'rtl';

const RTL_LOCALES: readonly string[] = ['ur', 'ar', 'fa', 'he'];

export function getDirection(locale: Locale | string): Direction {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
