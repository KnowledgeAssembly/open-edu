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
        undefined,
        { file: 'workflow.json', suggestion: 'Fix the JSON syntax error in workflow.json' },
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
    const firstIssue = result.error.issues[0];
    const wfPath = firstIssue ? firstIssue.path.join('.') : undefined;
    throw new WorkflowValidationError(`Invalid workflow.json: ${issues}`, result.error, {
      file: 'workflow.json',
      path: wfPath,
      suggestion: firstIssue
        ? `Fix the "${wfPath}" field in workflow.json`
        : 'Check the workflow.json structure matches the schema',
    });
  }

  return result.data;
}
