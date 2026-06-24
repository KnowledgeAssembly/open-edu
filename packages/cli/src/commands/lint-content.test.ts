import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LoadedPackage } from '@open-edu/core';

const mockLoadPackage = vi.hoisted(() => vi.fn());
const mockLintPackage = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  const actual = await vi.importActual('@open-edu/core');
  return {
    ...actual,
    loadPackage: mockLoadPackage,
    lintPackage: mockLintPackage,
  };
});

import { lintContent } from './lint-content';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/pkg',
  manifest: { id: 'pkg', title: 'Pkg', version: '1.0.0', author: 'A', entry: 'nodes/n.md' },
  workflow: null,
  rewards: null,
  nodes: [],
  assetPaths: [],
};

describe('lintContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return success with no warnings', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    mockLintPackage.mockReturnValue({ warnings: [], errors: [] });

    const result = await lintContent('/tmp/pkg');
    expect(result.success).toBe(true);
  });

  it('should return success with warnings under max', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    mockLintPackage.mockReturnValue({
      warnings: [{ file: 'nodes/n.md', message: 'No headings', detail: 'Add heading' }],
      errors: [],
    });

    const result = await lintContent('/tmp/pkg', { maxWarnings: 5 });
    expect(result.success).toBe(true);
  });

  it('should fail when warnings exceed max-warnings', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    mockLintPackage.mockReturnValue({
      warnings: [
        { file: 'a.md', message: 'w1' },
        { file: 'b.md', message: 'w2' },
        { file: 'c.md', message: 'w3' },
      ],
      errors: [],
    });

    const result = await lintContent('/tmp/pkg', { maxWarnings: 2 });
    expect(result.success).toBe(false);
  });

  it('should return error info in json mode', async () => {
    mockLoadPackage.mockRejectedValue(new Error('load failed'));
    const result = await lintContent('/tmp/pkg', { json: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('load failed');
    }
  });

  it('should return structured data in json mode', async () => {
    mockLoadPackage.mockResolvedValue(validPkg);
    mockLintPackage.mockReturnValue({
      warnings: [{ file: 'nodes/n.md', message: 'No headings', detail: 'Add heading' }],
      errors: [],
    });

    const result = await lintContent('/tmp/pkg', { json: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        valid: true,
        warningCount: 1,
        errorCount: 0,
        warnings: [{ file: 'nodes/n.md', message: 'No headings' }],
      });
    }
  });
});
