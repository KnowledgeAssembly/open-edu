import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OepReader } from '@open-edu/oep-distribution';
import { buildOepBundle } from './oep-build-bundle';

const validBundleManifest = {
  id: 'test-bundle',
  title: 'Test Bundle',
  version: '1.0.0',
  author: 'Test',
  modules: [{ id: 'mod-a', title: 'Module A', path: './modules/mod-a', dependsOn: [] }],
};

const validPackageManifest = {
  id: 'mod-a',
  title: 'Module A',
  version: '1.0.0',
  author: 'Test',
  entry: 'nodes/lesson.md',
};

describe('buildOepBundle', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oep-bundle-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('includes bundle-root rewards.json and cards.json in the output', async () => {
    const dir = join(tmpDir, 'bundle');
    mkdirSync(join(dir, 'modules', 'mod-a', 'nodes'), { recursive: true });
    writeFileSync(
      join(dir, 'bundle.json'),
      JSON.stringify({ ...validBundleManifest, rewards: './rewards.json', cards: './cards.json' }),
    );
    writeFileSync(join(dir, 'rewards.json'), JSON.stringify({ triggers: [] }));
    writeFileSync(join(dir, 'cards.json'), JSON.stringify({ cards: [] }));
    writeFileSync(
      join(dir, 'modules', 'mod-a', 'package.json'),
      JSON.stringify(validPackageManifest),
    );
    writeFileSync(join(dir, 'modules', 'mod-a', 'nodes', 'lesson.md'), '# Lesson');

    const outputDir = join(tmpDir, 'out');
    const result = await buildOepBundle(dir, outputDir, { json: true });
    expect(result.success).toBe(true);

    const oepPath = join(outputDir, 'test-bundle-1.0.0.oep');
    const extraction = await new OepReader().read(readFileSync(oepPath));
    expect(extraction.rewards).toEqual({ triggers: [] });
    expect(extraction.cards).toEqual({ cards: [] });
  });
});
