import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the `data/` directory containing the committed JSON artifacts.
 *
 * In source (vitest) mode `__dirname` is `src`, so `src/data` is used
 * directly. In a built package `__dirname` is `dist`; the build copies
 * `src/data/*.json` -> `dist/data`, but we fall back to the src tree so a
 * fresh `tsc` without the copy step does not crash at import time (tests,
 * the generator, and editor tooling all stay green from a clean checkout).
 */
export function resolveDataDir(): string {
  const local = join(__dirname, 'data');
  if (existsSync(local)) return local;
  return join(__dirname, '..', 'src', 'data');
}

export function readDataFile(name: string): string {
  return readFileSync(join(resolveDataDir(), name), 'utf-8');
}
