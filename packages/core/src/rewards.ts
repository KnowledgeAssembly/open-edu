import { RewardsSchema } from '@open-edu/schemas';
import type { Rewards } from '@open-edu/schemas';
import { RewardsValidationError } from './errors.js';

export function parseRewards(content: string, filePath = 'rewards.json'): Rewards {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new RewardsValidationError(
        `${filePath} is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: filePath,
          suggestion: `Fix the JSON syntax error in ${filePath}`,
        },
      );
    }
    throw new RewardsValidationError(`Failed to parse ${filePath}: ${(err as Error).message}`);
  }

  const result = RewardsSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`,
      )
      .join('; ');
    const firstIssue = result.error.issues[0];
    const rPath = firstIssue ? firstIssue.path.join('.') : undefined;
    throw new RewardsValidationError(`Invalid ${filePath}: ${issues}`, result.error, {
      file: filePath,
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in ${filePath}`
        : `Check the ${filePath} structure matches the schema`,
    });
  }

  return result.data;
}

export async function loadRewards(
  packageDir: string,
  options?: { filename?: string },
): Promise<Rewards | null> {
  const { readFile, access } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const filename = options?.filename ?? 'rewards.json';
  const rewardsPath = join(packageDir, filename);

  try {
    await access(rewardsPath);
  } catch {
    return null;
  }

  let content: string;
  try {
    content = await readFile(rewardsPath, 'utf-8');
  } catch (err) {
    throw new RewardsValidationError(`Failed to read ${filename}: ${(err as Error).message}`);
  }

  return parseRewards(content, filename);
}
