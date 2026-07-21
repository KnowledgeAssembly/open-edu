import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { CliResult } from '../utils/json-output.js';

export async function i18nValidate(localesDir: string): Promise<CliResult> {
  const errors: string[] = [];
  const localeDirs = readdirSync(localesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (localeDirs.length === 0) {
    return { success: false, error: 'No locale directories found', code: 1 };
  }

  const referenceLocale = localeDirs.includes('en') ? 'en' : localeDirs[0]!;
  const referenceKeys = new Map<string, string[]>();

  function collectKeys(filePath: string, prefix: string): void {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    for (const [key, value] of Object.entries(data)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        collectKeys(filePath, fullKey);
      } else {
        const ns = prefix.split('.')[0] ?? fullKey;
        if (!referenceKeys.has(ns)) referenceKeys.set(ns, []);
        referenceKeys.get(ns)!.push(fullKey);
      }
    }
  }

  const refDir = join(localesDir, referenceLocale);
  for (const file of readdirSync(refDir)) {
    if (file.endsWith('.json')) {
      collectKeys(join(refDir, file), file.replace('.json', ''));
    }
  }

  for (const locale of localeDirs.filter((l) => l !== referenceLocale)) {
    const localeDir = join(localesDir, locale);
    for (const [ns, keys] of referenceKeys) {
      const filePath = join(localeDir, `${ns}.json`);
      if (!existsSync(filePath)) {
        errors.push(`[${locale}] Missing namespace file: ${ns}.json`);
        continue;
      }
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      for (const key of keys) {
        const shortKey = key.split('.').slice(1).join('.');
        if (!(shortKey in data)) {
          errors.push(`[${locale}] Missing key: ${key}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, error: `Validation failed:\n${errors.join('\n')}`, code: 1 };
  }

  return {
    success: true,
    data: {
      validLocales: localeDirs.length,
      message: `All ${localeDirs.length} locales are valid`,
    },
  };
}
