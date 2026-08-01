import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { coreValidatorLogger } from './logger.js';

export interface IntegrityMismatch {
  path: string;
  expected: string;
  actual: string;
}

export interface IntegrityResult {
  valid: boolean;
  mismatches: IntegrityMismatch[];
  missing: string[];
  checked: number;
}

export function computeFileHash(filePath: string): string {
  const hash = createHash('sha256');
  const content = readFileSync(filePath);
  hash.update(content);
  return hash.digest('hex');
}

const IGNORED_PREFIXES = ['.edu/', 'telemetry/'];

function shouldIgnore(relativePath: string): boolean {
  return IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

export interface BuildManifestEntry {
  path: string;
  hash: string;
}

export interface BuildManifest {
  packageId: string;
  packageVersion: string;
  builtAt: string;
  openEduVersion: string;
  files: BuildManifestEntry[];
  entry: string;
}

export function verifyIntegrity(packageDir: string): IntegrityResult {
  coreValidatorLogger.info('Verifying package integrity...', { packageDir });
  const manifestPath = join(packageDir, 'open-edu-build.json');

  if (!existsSync(manifestPath)) {
    coreValidatorLogger.warn('Build manifest not found', { packageDir });
    return { valid: false, mismatches: [], missing: ['open-edu-build.json'], checked: 0 };
  }

  let manifest: BuildManifest;
  try {
    const raw = readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(raw);
  } catch {
    return {
      valid: false,
      mismatches: [],
      missing: ['open-edu-build.json (invalid JSON)'],
      checked: 0,
    };
  }

  const mismatches: IntegrityMismatch[] = [];
  const missing: string[] = [];
  let checked = 0;

  for (const entry of manifest.files) {
    if (shouldIgnore(entry.path)) {
      continue;
    }
    const filePath = join(packageDir, entry.path);
    if (!existsSync(filePath)) {
      missing.push(entry.path);
      continue;
    }
    checked++;
    const actualHash = computeFileHash(filePath);
    if (actualHash !== entry.hash) {
      mismatches.push({ path: entry.path, expected: entry.hash, actual: actualHash });
    }
  }

  const result = {
    valid: mismatches.length === 0 && missing.length === 0,
    mismatches,
    missing,
    checked,
  };

  if (result.valid) {
    coreValidatorLogger.info('Integrity check passed', { packageDir, checked: result.checked });
  } else {
    coreValidatorLogger.warn('Integrity check failed', {
      packageDir,
      mismatchCount: result.mismatches.length,
      missingCount: result.missing.length,
    });
  }

  return result;
}
