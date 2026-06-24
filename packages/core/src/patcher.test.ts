import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { applyPatch } from './patcher';
import type { PatchOperation } from './patcher';

let tempDir: string;

function createMinimalPackage(dir: string): void {
  mkdirSync(join(dir, 'nodes'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        id: 'test-pkg',
        title: 'Test Package',
        version: '0.1.0',
        author: 'Test',
        entry: 'nodes/intro.md',
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  writeFileSync(
    join(dir, 'workflow.json'),
    JSON.stringify(
      {
        routing: {
          'nodes/intro.md': { onComplete: 'COMPLETED' },
        },
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );
  writeFileSync(join(dir, 'nodes/intro.md'), '# Introduction\n\nWelcome!\n', 'utf-8');
}

beforeEach(() => {
  tempDir = resolve(
    tmpdir(),
    `edu-patch-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  createMinimalPackage(tempDir);
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('applyPatch', () => {
  it('should replace a field in package.json', async () => {
    const operations: PatchOperation[] = [
      { op: 'replace', path: '/package.json/title', value: 'Updated Title' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.title).toBe('Updated Title');
  });

  it('should add a new field to package.json', async () => {
    const operations: PatchOperation[] = [
      { op: 'add', path: '/package.json/description', value: 'A test package' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.description).toBe('A test package');
  });

  it('should remove a non-schema field from package.json', async () => {
    // First add a custom field that's not in the schema
    const addOp: PatchOperation[] = [
      { op: 'add', path: '/package.json/customField', value: 'custom-value' },
    ];
    await applyPatch(tempDir, addOp);

    // Now remove it
    const operations: PatchOperation[] = [{ op: 'remove', path: '/package.json/customField' }];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.customField).toBeUndefined();
  });

  it('should remove a schema-required field and fail validation', async () => {
    const operations: PatchOperation[] = [{ op: 'remove', path: '/package.json/author' }];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(false);
    // File should be reverted
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.author).toBe('Test');
  });

  it('should upsert a node file', async () => {
    const operations: PatchOperation[] = [
      {
        op: 'upsert-node',
        nodeId: 'nodes/quiz.json',
        content: {
          type: 'quiz',
          question: 'Test?',
          options: [
            { id: 'a', text: 'Yes', correct: true },
            { id: 'b', text: 'No', correct: false },
          ],
        },
      },
      {
        op: 'replace',
        path: '/workflow.json/routing',
        value: {
          'nodes/intro.md': { onComplete: 'nodes/quiz.json' },
          'nodes/quiz.json': { onComplete: 'COMPLETED' },
        },
      },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    expect(existsSync(join(tempDir, 'nodes/quiz.json'))).toBe(true);
  });

  it('should remove a node file and its workflow references, updating dependent routes', async () => {
    // First add a second node and routing
    const addOps: PatchOperation[] = [
      {
        op: 'upsert-node',
        nodeId: 'nodes/quiz.json',
        content: {
          type: 'quiz',
          question: 'Q?',
          options: [
            { id: 'a', text: 'A', correct: true },
            { id: 'b', text: 'B', correct: false },
          ],
        },
      },
      {
        op: 'replace',
        path: '/workflow.json/routing',
        value: {
          'nodes/intro.md': { onComplete: 'nodes/quiz.json' },
          'nodes/quiz.json': { onComplete: 'COMPLETED' },
        },
      },
    ];
    await applyPatch(tempDir, addOps);

    // Now remove the quiz node — needs to also fix intro.md's onComplete
    const removeOps: PatchOperation[] = [
      { op: 'remove-node', nodeId: 'nodes/quiz.json' },
      {
        op: 'replace',
        path: '/workflow.json/routing',
        value: { 'nodes/intro.md': { onComplete: 'COMPLETED' } },
      },
    ];
    const report = await applyPatch(tempDir, removeOps);
    expect(report.validationResult.valid).toBe(true);
    expect(existsSync(join(tempDir, 'nodes/quiz.json'))).toBe(false);

    const workflow = JSON.parse(readFileSync(join(tempDir, 'workflow.json'), 'utf-8'));
    expect(workflow.routing['nodes/quiz.json']).toBeUndefined();
    expect(workflow.routing['nodes/intro.md']).toEqual({ onComplete: 'COMPLETED' });
  });

  it('should reject invalid patches (validation failure) and revert files', async () => {
    // Remove the entry node but keep workflow reference -> should fail
    const operations: PatchOperation[] = [{ op: 'remove-node', nodeId: 'nodes/intro.md' }];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(false);
    // Files should be reverted
    expect(existsSync(join(tempDir, 'nodes/intro.md'))).toBe(true);
  });

  it('should show dry-run without modifying files', async () => {
    const operations: PatchOperation[] = [
      { op: 'replace', path: '/package.json/title', value: 'DRY RUN' },
    ];
    const report = await applyPatch(tempDir, operations, { dryRun: true });
    expect(report.validationResult.valid).toBe(true);
    // File should NOT have been modified
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.title).toBe('Test Package');
  });

  it('should return a patch report with operations and diffSummary', async () => {
    const operations: PatchOperation[] = [
      { op: 'replace', path: '/package.json/title', value: 'New Title' },
      { op: 'add', path: '/package.json/description', value: 'Desc' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.operations).toHaveLength(2);
    expect(report.diffSummary.length).toBeGreaterThan(0);
    expect(report.validationResult.valid).toBe(true);
    expect(report.operations[0]!.status).toBe('applied');
    expect(report.operations[1]!.status).toBe('applied');
  });

  it('should skip add if field already exists', async () => {
    const operations: PatchOperation[] = [
      { op: 'add', path: '/package.json/title', value: 'Duplicate' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.operations[0]!.status).toBe('skipped');
    expect(report.validationResult.valid).toBe(true);
  });

  it('should skip remove if field does not exist', async () => {
    const operations: PatchOperation[] = [{ op: 'remove', path: '/package.json/nonexistent' }];
    const report = await applyPatch(tempDir, operations);
    expect(report.operations[0]!.status).toBe('skipped');
    expect(report.validationResult.valid).toBe(true);
  });

  it('should skip replace if field does not exist', async () => {
    const operations: PatchOperation[] = [
      { op: 'replace', path: '/package.json/nonexistent', value: 'val' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.operations[0]!.status).toBe('skipped');
    expect(report.validationResult.valid).toBe(true);
  });

  it('should add nested fields', async () => {
    const operations: PatchOperation[] = [
      { op: 'add', path: '/package.json/scripts/test', value: 'vitest run' },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.scripts?.test).toBe('vitest run');
  });

  it('should handle upsert-node with nodeId without nodes/ prefix', async () => {
    const operations: PatchOperation[] = [
      {
        op: 'upsert-node',
        nodeId: 'quiz.json',
        content: JSON.stringify({
          type: 'quiz',
          question: 'Q?',
          options: [
            { id: 'a', text: 'A', correct: true },
            { id: 'b', text: 'B', correct: false },
          ],
        }),
      },
      {
        op: 'replace',
        path: '/workflow.json/routing',
        value: {
          'nodes/intro.md': { onComplete: 'COMPLETED' },
          'nodes/quiz.json': { onComplete: 'COMPLETED' },
        },
      },
    ];
    const report = await applyPatch(tempDir, operations);
    expect(report.validationResult.valid).toBe(true);
    expect(existsSync(join(tempDir, 'nodes/quiz.json'))).toBe(true);
  });
});
