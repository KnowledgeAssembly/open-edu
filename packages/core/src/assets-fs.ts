import { readdir } from 'node:fs/promises';

export async function collectAssetFiles(
  dir: string,
  join: (...parts: string[]) => string,
): Promise<string[]> {
  const assetPaths: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const nested = await collectAssetFiles(join(dir, entry.name), join);
        assetPaths.push(...nested);
      } else if (entry.isFile()) {
        assetPaths.push(join(dir, entry.name));
      }
    }
  } catch {
    // assets/ directory doesn't exist — no assets
  }

  return assetPaths;
}
