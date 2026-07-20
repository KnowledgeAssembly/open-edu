import { z } from 'zod';

export const LocalizedSchema = z.union([
  z.string(),
  z.record(z.string(), z.string()),
]).refine(
  (val) => typeof val === 'string' || Object.keys(val).length > 0,
  { message: 'Localized record must have at least one entry' }
);

export type Localized<T extends string = string> = T | Record<string, T>;

export function isLocalized(value: unknown): value is Record<string, string> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function localizedField(maxLength?: number) {
  const strSchema = maxLength !== undefined ? z.string().max(maxLength) : z.string();
  return z.union([strSchema, z.record(z.string(), strSchema)]);
}

export function extractLocalized(
  value: string | Record<string, string>,
  locale: string,
  fallbackLocale: string = 'en'
): string {
  if (typeof value === 'string') return value;
  if (value[locale]) return value[locale];
  if (value[fallbackLocale]) return value[fallbackLocale];
  const firstKey = Object.keys(value)[0];
  return firstKey ? (value[firstKey] ?? '') : '';
}
