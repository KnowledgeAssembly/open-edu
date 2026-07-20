import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { i18nValidate } from './i18n-validate.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_i18n_validate__');

beforeEach(() => {
  mkdirSync(join(TMP_DIR, 'en'), { recursive: true });
  mkdirSync(join(TMP_DIR, 'hi'), { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('i18nValidate', () => {
  it('returns success when all locales match reference', async () => {
    writeFileSync(join(TMP_DIR, 'en', 'runtime.json'), JSON.stringify({ loading: 'Loading…' }));
    writeFileSync(join(TMP_DIR, 'hi', 'runtime.json'), JSON.stringify({ loading: 'लोड' }));
    const result = await i18nValidate(TMP_DIR);
    expect(result.success).toBe(true);
  });

  it('returns failure when a key is missing', async () => {
    writeFileSync(
      join(TMP_DIR, 'en', 'runtime.json'),
      JSON.stringify({ loading: 'Loading…', submit: 'Submit' }),
    );
    writeFileSync(join(TMP_DIR, 'hi', 'runtime.json'), JSON.stringify({ loading: 'लोड' }));
    const result = await i18nValidate(TMP_DIR);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing key');
    }
  });

  it('returns failure when a namespace file is missing', async () => {
    writeFileSync(join(TMP_DIR, 'en', 'runtime.json'), JSON.stringify({ a: '1' }));
    writeFileSync(join(TMP_DIR, 'hi', 'runtime.json'), JSON.stringify({ a: '१' }));
    writeFileSync(join(TMP_DIR, 'en', 'learner.json'), JSON.stringify({ b: '2' }));
    const result = await i18nValidate(TMP_DIR);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Missing namespace file: learner.json');
    }
  });

  it('returns failure when no locale directories exist', async () => {
    rmSync(TMP_DIR, { recursive: true, force: true });
    mkdirSync(TMP_DIR, { recursive: true });
    const result = await i18nValidate(TMP_DIR);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('No locale directories found');
    }
  });
});
