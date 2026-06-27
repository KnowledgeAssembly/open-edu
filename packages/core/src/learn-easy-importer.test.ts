import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importLearnEasy } from './learn-easy-importer';

describe('importLearnEasy', () => {
  let tmpDir: string;

  beforeEach(() => {
    const fixtureDir = join(__dirname, '__fixtures__');
    mkdirSync(fixtureDir, { recursive: true });
    tmpDir = mkdtempSync(join(fixtureDir, 'le-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create bundle from JSON activity files', async () => {
    // Create source directory with two module JSON files
    const sourceDir = join(tmpDir, 'source');
    mkdirSync(sourceDir, { recursive: true });

    writeFileSync(
      join(sourceDir, 'addition_basics.json'),
      JSON.stringify({
        id: 'addition_basics',
        title: 'Addition Basics',
        activities: [
          { id: 'observe', title: 'Observe Addition', type: 'lesson' },
          { id: 'practice', title: 'Practice Addition', type: 'exercise' },
        ],
      }),
    );

    writeFileSync(
      join(sourceDir, 'addition_carry.json'),
      JSON.stringify({
        id: 'addition_carry',
        title: 'Addition with Carry',
        prerequisites: ['addition_basics'],
        activities: [
          { id: 'learn-carry', title: 'Learn Carrying', type: 'lesson' },
          { id: 'quiz-carry', title: 'Carry Quiz', type: 'quiz' },
          { id: 'reflect', title: 'Reflect', type: 'reflection' },
        ],
      }),
    );

    const outputDir = join(tmpDir, 'output');
    const result = await importLearnEasy({
      sourceDir,
      outputDir,
      bundleTitle: 'Level B Math',
      bundleAuthor: 'Test Author',
    });

    expect(result.moduleCount).toBe(2);
    expect(result.nodeCount).toBe(5);
    expect(result.warnings).toEqual([]);

    // Verify bundle.json
    const bundleJson = JSON.parse(readFileSync(join(outputDir, 'bundle.json'), 'utf-8'));
    expect(bundleJson.title).toBe('Level B Math');
    expect(bundleJson.modules).toHaveLength(2);
    expect(bundleJson.modules[0].dependsOn).toEqual([]);
    expect(bundleJson.modules[1].dependsOn).toEqual(['addition_basics']);

    // Verify module package.json exists
    const modPkg = JSON.parse(
      readFileSync(join(outputDir, 'modules', 'addition_basics', 'package.json'), 'utf-8'),
    );
    expect(modPkg.id).toBe('addition_basics');

    // Verify workflow
    const workflow = JSON.parse(
      readFileSync(join(outputDir, 'modules', 'addition_basics', 'workflow.json'), 'utf-8'),
    );
    expect(Object.keys(workflow.routing)).toHaveLength(2);
  });

  it('should throw for nonexistent source directory', async () => {
    await expect(
      importLearnEasy({
        sourceDir: '/nonexistent/path',
        outputDir: join(tmpDir, 'out'),
      }),
    ).rejects.toThrow('does not exist');
  });

  it('should handle empty source directory', async () => {
    const sourceDir = join(tmpDir, 'empty-source');
    mkdirSync(sourceDir, { recursive: true });

    const result = await importLearnEasy({
      sourceDir,
      outputDir: join(tmpDir, 'out'),
    });

    expect(result.moduleCount).toBe(0);
    expect(result.nodeCount).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should skip invalid JSON files with warning', async () => {
    const sourceDir = join(tmpDir, 'source');
    mkdirSync(sourceDir, { recursive: true });
    writeFileSync(join(sourceDir, 'invalid.json'), '{invalid');

    const result = await importLearnEasy({
      sourceDir,
      outputDir: join(tmpDir, 'out'),
    });

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should generate valid package manifests', async () => {
    const sourceDir = join(tmpDir, 'source');
    mkdirSync(sourceDir, { recursive: true });

    writeFileSync(
      join(sourceDir, 'test-mod.json'),
      JSON.stringify({
        id: 'test-mod',
        title: 'Test Module',
        activities: [{ id: 'act1', title: 'Activity 1', type: 'lesson' }],
      }),
    );

    const outputDir = join(tmpDir, 'output');
    const result = await importLearnEasy({ sourceDir, outputDir });

    expect(result.moduleCount).toBe(1);
    expect(result.nodeCount).toBe(1);

    // Verify generated package validates
    const { loadPackage } = await import('./loader');
    const pkg = await loadPackage(join(outputDir, 'modules', 'test-mod'));
    expect(pkg.manifest.id).toBe('test-mod');
    expect(pkg.nodes).toHaveLength(1);
  });
});
