import { WorkflowSchema } from '@open-edu/schemas';
import type { Workflow } from '@open-edu/schemas';
import { WorkflowValidationError } from './errors.js';

export function parseWorkflow(content: string, filePath = 'workflow.json'): Workflow {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new WorkflowValidationError(
        `${filePath} is not valid JSON: ${(err as Error).message}`,
        undefined,
        { file: filePath, suggestion: `Fix the JSON syntax error in ${filePath}` },
      );
    }
    throw new WorkflowValidationError(`Failed to parse ${filePath}: ${(err as Error).message}`);
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
    throw new WorkflowValidationError(`Invalid ${filePath}: ${issues}`, result.error, {
      file: filePath,
      path: wfPath,
      suggestion: firstIssue
        ? `Fix the "${wfPath}" field in ${filePath}`
        : `Check the ${filePath} structure matches the schema`,
    });
  }

  return result.data;
}

export async function loadWorkflow(packageDir: string): Promise<Workflow | null> {
  const { readFile, access } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const workflowPath = join(packageDir, 'workflow.json');

  try {
    await access(workflowPath);
  } catch {
    return null;
  }

  let content: string;
  try {
    content = await readFile(workflowPath, 'utf-8');
  } catch (err) {
    throw new WorkflowValidationError(`Failed to read workflow.json: ${(err as Error).message}`);
  }

  return parseWorkflow(content);
}
