import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { CardDefinitionsSchema } from '@open-edu/schemas';
import type { CardDefinitions } from '@open-edu/schemas';
import { CardsValidationError } from './errors.js';

export async function loadCards(
  packageDir: string,
  options?: { filename?: string },
): Promise<CardDefinitions | null> {
  const filename = options?.filename ?? 'cards.json';
  const cardsPath = join(packageDir, filename);

  try {
    await access(cardsPath);
  } catch {
    return null;
  }

  let raw: unknown;
  try {
    const content = await readFile(cardsPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new CardsValidationError(
        `${filename} is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: filename,
          suggestion: `Fix the JSON syntax error in ${filename}`,
        },
      );
    }
    throw new CardsValidationError(`Failed to read ${filename}: ${(err as Error).message}`);
  }

  const result = CardDefinitionsSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const firstIssue = result.error.issues[0];
    const rPath = firstIssue ? firstIssue.path.join('.') : undefined;
    throw new CardsValidationError(`Invalid ${filename}: ${issues}`, result.error, {
      file: filename,
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in ${filename}`
        : `Check the ${filename} structure matches the schema`,
    });
  }

  return result.data;
}
