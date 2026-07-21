import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { i18nExtract } from './i18n-extract.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_i18n_extract__');

beforeEach(() => {
  mkdirSync(TMP_DIR, { recursive: true });
  mkdirSync(join(TMP_DIR, 'src'), { recursive: true });
});

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true });
});

describe('i18nExtract', () => {
  it('extracts translation keys from source files', async () => {
    writeFileSync(
      join(TMP_DIR, 'src', 'app.tsx'),
      `const x = t('runtime.loading'); const y = t('learner.nav.home');`,
    );
    const result = await i18nExtract(join(TMP_DIR, 'src'), TMP_DIR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keysCount).toBe(2);
    }
  });

  it('deduplicates keys', async () => {
    writeFileSync(join(TMP_DIR, 'src', 'a.ts'), `t('runtime.loading'); t('runtime.loading');`);
    writeFileSync(join(TMP_DIR, 'src', 'b.ts'), `t('runtime.loading');`);
    const result = await i18nExtract(join(TMP_DIR, 'src'), TMP_DIR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keysCount).toBe(1);
    }
  });

  it('skips node_modules and dist directories', async () => {
    mkdirSync(join(TMP_DIR, 'src', 'node_modules'), { recursive: true });
    mkdirSync(join(TMP_DIR, 'src', 'dist'), { recursive: true });
    writeFileSync(join(TMP_DIR, 'src', 'node_modules', 'pkg.ts'), `t('skip.this');`);
    writeFileSync(join(TMP_DIR, 'src', 'dist', 'out.js'), `t('skip.this.too');`);
    writeFileSync(join(TMP_DIR, 'src', 'app.ts'), `t('keep.this');`);
    const result = await i18nExtract(join(TMP_DIR, 'src'), TMP_DIR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keysCount).toBe(1);
    }
  });

  it('returns success with zero keys when no t() calls found', async () => {
    writeFileSync(join(TMP_DIR, 'src', 'empty.ts'), `const x = 1;`);
    const result = await i18nExtract(join(TMP_DIR, 'src'), TMP_DIR);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keysCount).toBe(0);
    }
  });
});
