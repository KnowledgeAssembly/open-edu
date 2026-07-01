import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { CardDefinitionsSchema } from '@open-edu/schemas';
import type { CardDefinitions } from '@open-edu/schemas';
import { CardsValidationError } from './errors.js';

export async function loadCards(packageDir: string): Promise<CardDefinitions | null> {
  const cardsPath = join(packageDir, 'cards.json');

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
        `cards.json is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: 'cards.json',
          suggestion: 'Fix the JSON syntax error in cards.json',
        },
      );
    }
    throw new CardsValidationError(`Failed to read cards.json: ${(err as Error).message}`);
  }

  const result = CardDefinitionsSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const firstIssue = result.error.issues[0];
    const rPath = firstIssue ? firstIssue.path.join('.') : undefined;
    throw new CardsValidationError(`Invalid cards.json: ${issues}`, result.error, {
      file: 'cards.json',
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in cards.json`
        : 'Check the cards.json structure matches the schema',
    });
  }

  return result.data;
}
