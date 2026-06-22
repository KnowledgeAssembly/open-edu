import { describe, it, expect } from 'vitest';
import { loadWorkflow } from './workflow';
import { WorkflowValidationError } from './errors';
import { resolve, join } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';

const fixturesDir = resolve(__dirname, '__fixtures__');

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
