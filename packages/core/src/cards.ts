import { CardDefinitionsSchema } from '@open-edu/schemas';
import type { CardDefinitions } from '@open-edu/schemas';
import { CardsValidationError } from './errors.js';

export function parseCards(content: string, filePath = 'cards.json'): CardDefinitions {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new CardsValidationError(
        `${filePath} is not valid JSON: ${(err as Error).message}`,
        undefined,
        {
          file: filePath,
          suggestion: `Fix the JSON syntax error in ${filePath}`,
        },
      );
    }
    throw new CardsValidationError(`Failed to parse ${filePath}: ${(err as Error).message}`);
  }

  const result = CardDefinitionsSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    const firstIssue = result.error.issues[0];
    const rPath = firstIssue ? firstIssue.path.join('.') : undefined;
    throw new CardsValidationError(`Invalid ${filePath}: ${issues}`, result.error, {
      file: filePath,
      path: rPath,
      suggestion: firstIssue
        ? `Fix the "${rPath}" field in ${filePath}`
        : `Check the ${filePath} structure matches the schema`,
    });
  }

  return result.data;
}

export async function loadCards(
  packageDir: string,
  options?: { filename?: string },
): Promise<CardDefinitions | null> {
  const { readFile, access } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const filename = options?.filename ?? 'cards.json';
  const cardsPath = join(packageDir, filename);

  try {
    await access(cardsPath);
  } catch {
    return null;
  }

  let content: string;
  try {
    content = await readFile(cardsPath, 'utf-8');
  } catch (err) {
    throw new CardsValidationError(`Failed to read ${filename}: ${(err as Error).message}`);
  }

  return parseCards(content, filename);
}
