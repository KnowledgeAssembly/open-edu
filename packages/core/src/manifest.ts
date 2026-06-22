import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { PackageManifestSchema } from '@open-edu/schemas';
import type { PackageManifest } from '@open-edu/schemas';
import { ManifestValidationError } from './errors';

export async function loadManifest(packageDir: string): Promise<PackageManifest> {
  const manifestPath = join(packageDir, 'package.json');

  try {
    await access(manifestPath);
  } catch {
    throw new ManifestValidationError(`package.json not found in package directory: ${packageDir}`);
  }

  let raw: unknown;
  try {
    const content = await readFile(manifestPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new ManifestValidationError(
        `package.json is not valid JSON: ${(err as Error).message}`,
      );
    }
    throw err;
  }

  const result = PackageManifestSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map(
        (i: { path: (string | number)[]; message: string }) => `${i.path.join('.')}: ${i.message}`,
      )
      .join('; ');
    throw new ManifestValidationError(`Invalid package.json: ${issues}`, result.error);
  }

  return result.data;
}
