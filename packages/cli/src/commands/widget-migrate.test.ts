import { describe, it, expect, vi } from 'vitest';
import { migratePackage } from './widget-migrate';

const MOCK_DIRS = new Set(['/fake/pkg', '/fake/pkg/nodes']);

const mockFiles: Record<string, string[]> = {
  '/fake/pkg': ['package.json', 'workflow.json', 'nodes'],
  '/fake/pkg/nodes': ['intro.md'],
};

const mockFileContents: Record<string, string> = {
  '/fake/pkg/package.json': JSON.stringify({
    id: 'test-pkg',
    title: 'Test',
    version: '1.0.0',
    entry: 'nodes/intro.md',
  }),
  '/fake/pkg/nodes/intro.md': '---\ntitle: Intro\n---\n\nSome content.',
};

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn((path: string) => {
    const p = String(path);
    return mockFileContents[p] ?? '';
  }),
  readdirSync: vi.fn((path: string) => {
    const p = String(path);
    return mockFiles[p] ?? [];
  }),
  statSync: vi.fn((path: string) => {
    const p = String(path);
    return { isDirectory: () => MOCK_DIRS.has(p) };
  }),
  writeFileSync: vi.fn(),
}));

describe('migratePackage', () => {
  it('returns migration report with no changes for clean package', async () => {
    const result = await migratePackage('/fake/pkg', { dryRun: true });
    expect(result.migrated).toBe(0);
    expect(result.changes).toHaveLength(0);
  });

  it('detects open-edu.* references in content', async () => {
    mockFileContents['/fake/pkg/nodes/intro.md'] =
      '---\ntitle: Intro\n---\n\nwidget: open-edu.visual-counting\n\nSome content.';

    const result = await migratePackage('/fake/pkg', { dryRun: true });
    expect(result.migrated).toBeGreaterThan(0);
    expect(result.changes[0]?.oldId).toBe('open-edu.visual-counting');
    expect(result.changes[0]?.newId).toBe('core.visual-counting');
  });
});
