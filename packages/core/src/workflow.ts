import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { WorkflowSchema } from '@open-edu/schemas';
import type { Workflow } from '@open-edu/schemas';
import { WorkflowValidationError } from './errors.js';

export async function loadWorkflow(packageDir: string): Promise<Workflow | null> {
  const workflowPath = join(packageDir, 'workflow.json');

  try {
    await access(workflowPath);
  } catch {
    return null;
  }

  let raw: unknown;
  try {
    const content = await readFile(workflowPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new WorkflowValidationError(
        `workflow.json is not valid JSON: ${(err as Error).message}`,
      );
    }
    throw new WorkflowValidationError(`Failed to read workflow.json: ${(err as Error).message}`);
  }

  const result = WorkflowSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`,
      )
      .join('; ');
    throw new WorkflowValidationError(`Invalid workflow.json: ${issues}`, result.error);
  }

  return result.data;
}
