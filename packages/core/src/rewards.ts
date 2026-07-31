import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { RewardsSchema } from '@open-edu/schemas';
import type { Rewards } from '@open-edu/schemas';
import { RewardsValidationError } from './errors.js';

export async function loadRewards(
  packageDir: string,
  options?: { filename?: string },
): Promise<Rewards | null> {
  const filename = options?.filename ?? 'rewards.json';
  const rewardsPath = join(packageDir, filename);

  try {
    await access(rewardsPath);
  } catch {
    return null;
  }

  let raw: unknown;
  try {
    const content = await readFile(rewardsPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new RewardsValidationError(
        `${filename} is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: filename,
          suggestion: `Fix the JSON syntax error in ${filename}`,
        },
      );
    }
    throw new RewardsValidationError(`Failed to read ${filename}: ${(err as Error).message}`);
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
    throw new RewardsValidationError(`Invalid ${filename}: ${issues}`, result.error, {
      file: filename,
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in ${filename}`
        : `Check the ${filename} structure matches the schema`,
    });
  }

  return result.data;
}
