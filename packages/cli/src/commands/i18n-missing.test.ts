import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { i18nMissing } from './i18n-missing.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_i18n_missing__');

beforeEach(() => {
  mkdirSync(join(TMP_DIR, 'en'), { recursive: true });
  mkdirSync(join(TMP_DIR, 'hi'), { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('i18nMissing', () => {
  it('returns success when no keys are missing', async () => {
    writeFileSync(join(TMP_DIR, 'en', 'runtime.json'), JSON.stringify({ a: '1', b: '2' }));
    writeFileSync(join(TMP_DIR, 'hi', 'runtime.json'), JSON.stringify({ a: '१', b: '२' }));
    const result = await i18nMissing(TMP_DIR, 'hi');
    expect(result.success).toBe(true);
  });

  it('returns failure with missing keys listed', async () => {
    writeFileSync(join(TMP_DIR, 'en', 'runtime.json'), JSON.stringify({ a: '1', b: '2', c: '3' }));
    writeFileSync(join(TMP_DIR, 'hi', 'runtime.json'), JSON.stringify({ a: '१' }));
    const result = await i18nMissing(TMP_DIR, 'hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('missing keys');
      expect(result.error).toContain('b');
      expect(result.error).toContain('c');
    }
  });

  it('reports entire file missing', async () => {
    writeFileSync(join(TMP_DIR, 'en', 'runtime.json'), JSON.stringify({ a: '1' }));
    writeFileSync(join(TMP_DIR, 'en', 'learner.json'), JSON.stringify({ b: '2' }));
    const result = await i18nMissing(TMP_DIR, 'hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('learner.json: entire file missing');
    }
  });

  it('returns failure when reference locale "en" is missing', async () => {
    rmSync(join(TMP_DIR, 'en'), { recursive: true, force: true });
    const result = await i18nMissing(TMP_DIR, 'hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Reference locale "en" not found');
    }
  });

  it('returns failure when target locale does not exist', async () => {
    rmSync(join(TMP_DIR, 'hi'), { recursive: true, force: true });
    const result = await i18nMissing(TMP_DIR, 'hi');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Target locale "hi" not found');
    }
  });
});
