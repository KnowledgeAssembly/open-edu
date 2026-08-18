import { describe, it, expect } from 'vitest';
import { loadWorkflow, parseWorkflow } from './workflow';
import { WorkflowValidationError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

const VALID_WORKFLOW = JSON.stringify({
  routing: {
    'nodes/lesson.md': { onComplete: 'COMPLETED' },
  },
});

describe('parseWorkflow', () => {
  it('parses a valid workflow', () => {
    const workflow = parseWorkflow(VALID_WORKFLOW);
    expect(workflow.routing['nodes/lesson.md']).toEqual({ onComplete: 'COMPLETED' });
  });

  it('rejects malformed JSON with a logical file path', () => {
    try {
      parseWorkflow('{bad', 'workflow.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowValidationError);
      expect((err as Error).message).toContain('workflow.json');
      expect((err as Error).message).not.toMatch(/[/\\](Users|home)/);
    }
  });

  it('rejects a schema-invalid workflow', () => {
    try {
      parseWorkflow(JSON.stringify({ routing: { 'nodes/x.md': 'not-an-object' } }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(WorkflowValidationError);
      expect((err as WorkflowValidationError).zodError).not.toBeNull();
    }
  });

  it('uses the logical path in schema error context', () => {
    try {
      parseWorkflow(JSON.stringify({ nope: true }), 'workflow.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('workflow.json');
    }
  });

  it('parses the browser-studio fixture workflow from bytes', () => {
    const workflow = parseWorkflow(
      JSON.stringify({
        routing: {
          'nodes/lesson.md': { onComplete: 'nodes/quiz.json' },
          'nodes/quiz.json': {
            conditions: [
              { if: 'score >= 80', then: 'COMPLETED' },
              { if: 'score < 80', then: 'nodes/lesson.md' },
            ],
          },
        },
      }),
    );
    expect(Object.keys(workflow.routing)).toHaveLength(2);
  });
});

describe('loadWorkflow', () => {
  it('should load a valid workflow', async () => {
    const workflow = await loadWorkflow(join(fixturesDir, 'valid-package'));
    expect(workflow).not.toBeNull();
    expect(workflow!.routing['nodes/lesson-01.md']).toBeDefined();
    expect(workflow!.routing['nodes/quiz-01.json']).toBeDefined();
  });

  it('should return null when workflow.json does not exist', async () => {
    const result = await loadWorkflow(join(fixturesDir, 'minimal-package'));
    expect(result).toBeNull();
  });

  it('should reject invalid JSON', async () => {
    const tmpDir = join(fixturesDir, 'minimal-package');
    const tmpPath = join(tmpDir, 'workflow.json');
    await writeFile(tmpPath, 'not valid json');
    await expect(loadWorkflow(tmpDir)).rejects.toThrow(WorkflowValidationError);
    await unlink(tmpPath);
  });
});
