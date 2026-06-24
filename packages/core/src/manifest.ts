import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { PackageManifestSchema } from '@open-edu/schemas';
import type { PackageManifest } from '@open-edu/schemas';
import { ManifestValidationError } from './errors.js';

const MANIFEST_EXAMPLES: Record<string, string> = {
  id: '"my-package"',
  title: '"My Package"',
  version: '"0.1.0"',
  author: '"Your Name"',
  entry: '"nodes/intro.md"',
};

function exampleValue(path: (string | number)[]): string {
  const key = String(path[0] ?? '');
  return MANIFEST_EXAMPLES[key] ?? '"<value>"';
}

export async function loadManifest(packageDir: string): Promise<PackageManifest> {
  const manifestPath = join(packageDir, 'package.json');

  try {
    await access(manifestPath);
  } catch {
    throw new ManifestValidationError(
      `package.json not found in package directory: ${packageDir}`,
      undefined,
      {
        file: 'package.json',
        suggestion: 'Create a package.json with id, title, version, author, and entry fields',
      },
    );
  }

  let raw: unknown;
  try {
    const content = await readFile(manifestPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ManifestValidationError(
        `package.json is not valid JSON: ${(err as Error).message}`,
        undefined,
        { file: 'package.json', suggestion: 'Fix the JSON syntax error in package.json' },
      );
    }
    throw new ManifestValidationError(`Failed to read package.json: ${(err as Error).message}`);
  }

  const result = PackageManifestSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`,
      )
      .join('; ');
    const firstIssue = result.error.issues[0];
    const path = firstIssue ? firstIssue.path.join('.') : undefined;
    const suggestion = firstIssue
      ? `Fix the "${path}" field in package.json. Example: ${exampleValue(firstIssue.path)}`
      : 'Check the package.json fields match the schema';
    throw new ManifestValidationError(`Invalid package.json: ${issues}`, result.error, {
      file: 'package.json',
      path,
      suggestion,
    });
  }

  return result.data;
}
