import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { importLearnEasyCommand } from './import';

describe('importLearnEasyCommand', () => {
  let tmpDir: string;

  beforeEach(() => {
    const fixtureDir = join(__dirname, '__fixtures__');
    mkdirSync(fixtureDir, { recursive: true });
    tmpDir = mkdtempSync(join(fixtureDir, 'import-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should import a Learn-Easy directory', async () => {
    const sourceDir = join(tmpDir, 'source');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(
      join(sourceDir, 'mod-a.json'),
      JSON.stringify({
        id: 'mod-a',
        title: 'Module A',
        activities: [{ id: 'act1', title: 'Activity 1', type: 'lesson' }],
      }),
    );

    const outputDir = join(tmpDir, 'output');
    const result = await importLearnEasyCommand(sourceDir, outputDir, {
      bundleTitle: 'Test Bundle',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const data = result.data as any;
      expect(data.moduleCount).toBe(1);
      expect(data.nodeCount).toBe(1);
    }
  });

  it('should handle missing source directory', async () => {
    const result = await importLearnEasyCommand('/nonexistent', join(tmpDir, 'out'), {});
    expect(result.success).toBe(false);
  });
});
