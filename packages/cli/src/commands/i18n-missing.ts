import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CliResult } from '../utils/json-output.js';

export async function i18nMissing(
  localesDir: string,
  targetLocale: string,
): Promise<CliResult> {
  const localeDirs = readdirSync(localesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (!localeDirs.includes('en')) {
    return { success: false, error: 'Reference locale "en" not found in locales directory', code: 1 };
  }

  if (!localeDirs.includes(targetLocale)) {
    return { success: false, error: `Target locale "${targetLocale}" not found in locales directory`, code: 1 };
  }

  const refDir = join(localesDir, 'en');
  const targetDir = join(localesDir, targetLocale);
  const missing: string[] = [];

  for (const file of readdirSync(refDir)) {
    if (!file.endsWith('.json')) continue;
    const refData = JSON.parse(readFileSync(join(refDir, file), 'utf-8'));
    let targetData: Record<string, string> = {};
    try {
      targetData = JSON.parse(readFileSync(join(targetDir, file), 'utf-8'));
    } catch {
      missing.push(`${file}: entire file missing`);
      continue;
    }

    const checkKeys = (obj: Record<string, unknown>, prefix: string): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          checkKeys(value as Record<string, unknown>, fullKey);
        } else if (!(fullKey in targetData)) {
          missing.push(fullKey);
        }
      }
    };

    checkKeys(refData, '');
  }

  if (missing.length === 0) {
    return { success: true, data: { locale: targetLocale, missingCount: 0 } };
  }

  return {
    success: false,
    error: `${missing.length} missing keys for "${targetLocale}":\n${missing.join('\n')}`,
    code: 1,
  };
}
