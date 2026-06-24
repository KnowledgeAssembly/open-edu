import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const mockApplyPatch = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  return {
    applyPatch: mockApplyPatch,
  };
});

import { patchPackage } from './patch';

describe('patchPackage', () => {
  let tempDir: string;
  let patchFilePath: string;

  const validPatch = JSON.stringify([
    { op: 'replace', path: '/package.json/title', value: 'New Title' },
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = resolve(
      tmpdir(),
      `edu-patch-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(tempDir, { recursive: true });
    patchFilePath = join(tempDir, 'patch.json');
    writeFileSync(patchFilePath, validPatch, 'utf-8');
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should apply a valid patch file', async () => {
    mockApplyPatch.mockResolvedValue({
      operations: [{ op: 'replace', path: '/package.json/title', status: 'applied' }],
      validationResult: { valid: true },
      diffSummary: ['  ~ /package.json/title', '', 'Validation: PASSED'],
    });

    const result = await patchPackage(tempDir, patchFilePath);
    expect(result.success).toBe(true);
    expect(mockApplyPatch).toHaveBeenCalledWith(tempDir, expect.any(Array), { dryRun: undefined });
  });

  it('should apply patch with --dry-run', async () => {
    mockApplyPatch.mockResolvedValue({
      operations: [{ op: 'replace', path: '/package.json/title', status: 'applied' }],
      validationResult: { valid: true },
      diffSummary: ['  ~ /package.json/title (dry run)', '', 'Validation: PASSED'],
    });

    const result = await patchPackage(tempDir, patchFilePath, { dryRun: true });
    expect(result.success).toBe(true);
    expect(mockApplyPatch).toHaveBeenCalledWith(tempDir, expect.any(Array), { dryRun: true });
  });

  it('should reject if patch file is not found', async () => {
    const result = await patchPackage(tempDir, '/nonexistent/patch.json');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('not found');
    }
  });

  it('should reject if patch file contains invalid JSON', async () => {
    writeFileSync(patchFilePath, 'not json', 'utf-8');
    const result = await patchPackage(tempDir, patchFilePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('parse');
    }
  });

  it('should reject if patch file is not an array', async () => {
    writeFileSync(patchFilePath, '{"op": "replace"}', 'utf-8');
    const result = await patchPackage(tempDir, patchFilePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('array');
    }
  });

  it('should return failure on validation error', async () => {
    mockApplyPatch.mockResolvedValue({
      operations: [{ op: 'replace', path: '/package.json/title', status: 'applied' }],
      validationResult: { valid: false, error: 'Entry node not found' },
      diffSummary: ['  ~ /package.json/title', '', 'Validation: FAILED'],
    });

    const result = await patchPackage(tempDir, patchFilePath);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Entry node not found');
    }
  });

  it('should return structured data in json mode on success', async () => {
    mockApplyPatch.mockResolvedValue({
      operations: [{ op: 'replace', path: '/package.json/title', status: 'applied' }],
      validationResult: { valid: true },
      diffSummary: ['  ~ /package.json/title', '', 'Validation: PASSED'],
    });

    const result = await patchPackage(tempDir, patchFilePath, { json: true });
    expect(result.success).toBe(true);
  });

  it('should return error data in json mode on failure', async () => {
    const result = await patchPackage(tempDir, '/nonexistent/patch.json', { json: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe(1);
    }
  });
});
