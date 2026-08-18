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

export function parseManifest(content: string, filePath = 'package.json'): PackageManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ManifestValidationError(
        `${filePath} is not valid JSON: ${(err as Error).message}`,
        undefined,
        { file: filePath, suggestion: `Fix the JSON syntax error in ${filePath}` },
      );
    }
    throw new ManifestValidationError(`Failed to parse ${filePath}: ${(err as Error).message}`);
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
      ? `Fix the "${path}" field in ${filePath}. Example: ${exampleValue(firstIssue.path)}`
      : `Check the ${filePath} fields match the schema`;
    throw new ManifestValidationError(`Invalid ${filePath}: ${issues}`, result.error, {
      file: filePath,
      path,
      suggestion,
    });
  }

  return result.data;
}

export async function loadManifest(packageDir: string): Promise<PackageManifest> {
  const { readFile, access } = await import('node:fs/promises');
  const { join } = await import('node:path');
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

  let content: string;
  try {
    content = await readFile(manifestPath, 'utf-8');
  } catch (err) {
    throw new ManifestValidationError(`Failed to read package.json: ${(err as Error).message}`);
  }

  return parseManifest(content);
}
