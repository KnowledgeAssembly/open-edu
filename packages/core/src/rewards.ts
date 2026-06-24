import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { RewardsSchema } from '@open-edu/schemas';
import type { Rewards } from '@open-edu/schemas';
import { RewardsValidationError } from './errors.js';

export async function loadRewards(packageDir: string): Promise<Rewards | null> {
  const rewardsPath = join(packageDir, 'rewards.json');

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
        `rewards.json is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: 'rewards.json',
          suggestion: 'Fix the JSON syntax error in rewards.json',
        },
      );
    }
    throw new RewardsValidationError(`Failed to read rewards.json: ${(err as Error).message}`);
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
    throw new RewardsValidationError(`Invalid rewards.json: ${issues}`, result.error, {
      file: 'rewards.json',
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in rewards.json`
        : 'Check the rewards.json structure matches the schema',
    });
  }

  return result.data;
}
