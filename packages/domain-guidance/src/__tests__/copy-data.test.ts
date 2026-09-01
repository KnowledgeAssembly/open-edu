import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('scripts/copy-data.mjs (CI build-data regression)', () => {
  it('keeps dist/data byte-identical to src/data after running the copy script', () => {
    const pkgRoot = join(__dirname, '..', '..');
    const script = join(pkgRoot, 'scripts', 'copy-data.mjs');
    const src = join(pkgRoot, 'src', 'data');
    const dist = join(pkgRoot, 'dist', 'data');

    execFileSync(process.execPath, [script], { cwd: pkgRoot });

    const srcFiles = readdirSync(src).filter((f) => f.endsWith('.json'));
    const distFiles = readdirSync(dist).filter((f) => f.endsWith('.json'));

    expect(distFiles.sort()).toEqual(srcFiles.sort());

    for (const file of srcFiles) {
      expect(readFileSync(join(dist, file), 'utf-8')).toBe(readFileSync(join(src, file), 'utf-8'));
    }
  });
});
