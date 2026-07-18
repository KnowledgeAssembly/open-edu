import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const mockGenerateAgentPrompt = vi.hoisted(() => vi.fn());
const mockLoadPackage = vi.hoisted(() => vi.fn());
const mockCreatePackage = vi.hoisted(() => vi.fn());
const mockGetDefaultWidgetCatalog = vi.hoisted(() => vi.fn());

vi.mock('@open-edu/core', async () => {
  return {
    generateAgentPrompt: mockGenerateAgentPrompt,
    getDefaultWidgetCatalog: mockGetDefaultWidgetCatalog.mockReturnValue(
      '## Widget Catalog\n\nMock catalog',
    ),
    loadPackage: mockLoadPackage,
  };
});

vi.mock('./create', async () => {
  return {
    createPackage: mockCreatePackage,
  };
});

import { generatePrompt, generateFromDescription } from './generate';

describe('generatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAgentPrompt.mockReturnValue('# Agent Prompt\n\nTemplate content');
  });

  it('should output the prompt template on stdout', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = await generatePrompt();
    expect(consoleSpy).toHaveBeenCalledWith('# Agent Prompt\n\nTemplate content');
    expect(result.success).toBe(true);
    consoleSpy.mockRestore();
  });

  it('should return prompt data in json mode', async () => {
    const result = await generatePrompt({ json: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prompt).toBe('# Agent Prompt\n\nTemplate content');
    }
  });
});

describe('generateFromDescription', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = resolve(
      tmpdir(),
      `edu-generate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mockCreatePackage.mockResolvedValue({
      success: true,
      files: ['package.json', 'workflow.json', 'nodes/intro.md', 'validate.test.ts'],
    });
    mockLoadPackage.mockResolvedValue({
      rootDir: tempDir,
      manifest: {
        id: 'test-pkg',
        title: 'Test Package',
        version: '0.1.0',
        author: 'Generated',
        entry: 'nodes/intro.md',
      },
      workflow: null,
      rewards: null,
      cards: null,
      nodes: [
        {
          path: join(tempDir, 'nodes/intro.md'),
          relativePath: 'nodes/intro.md',
          content: '# Test',
          node: { type: 'lesson' },
        },
      ],
      assetPaths: [],
    });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should create a valid package from a description', async () => {
    const result = await generateFromDescription(tempDir, 'Introduction to Variables');
    expect(result.success).toBe(true);
    expect(mockCreatePackage).toHaveBeenCalledWith(tempDir, {
      id: 'introduction-to-variables',
      title: 'Introduction to Variables',
      author: 'Generated',
      force: undefined,
    });
  });

  it('should return structured data in json mode', async () => {
    const result = await generateFromDescription(tempDir, 'Learn Rust', { json: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveProperty('directory');
      expect(result.data).toHaveProperty('manifest');
      expect(result.data).toHaveProperty('nodes');
    }
  });

  it('should fail if createPackage fails', async () => {
    mockCreatePackage.mockResolvedValue({ success: false, error: 'Directory not empty' });
    const result = await generateFromDescription(tempDir, 'Test');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Directory not empty');
    }
  });

  it('should fail if loadPackage fails after generation', async () => {
    mockLoadPackage.mockRejectedValue(new Error('Invalid package'));
    const result = await generateFromDescription(tempDir, 'Test');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Invalid package');
    }
  });

  it('should extract a deterministic ID from description', async () => {
    const result1 = await generateFromDescription(tempDir, 'Introduction to Variables');
    const result2 = await generateFromDescription(tempDir, 'Introduction to Variables');
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    // The IDs should both start with the same prefix from the same description
    const call1 = mockCreatePackage.mock.calls[0];
    const call2 = mockCreatePackage.mock.calls[1];
    expect(call1?.[1]?.id).toBe(call2?.[1]?.id);
  });
});
