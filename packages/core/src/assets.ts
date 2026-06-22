import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function collectAssetFiles(dir: string, baseDir: string): Promise<string[]> {
  const assetPaths: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await collectAssetFiles(fullPath, baseDir);
        assetPaths.push(...nested);
      } else {
        assetPaths.push(fullPath);
      }
    }
  } catch {
    // assets/ directory doesn't exist — no assets
  }

  return assetPaths;
}

export async function resolveAssets(packageDir: string): Promise<string[]> {
  const assetsDir = join(packageDir, 'assets');
  return collectAssetFiles(assetsDir, assetsDir);
}

export function resolveAssetPath(packageDir: string, relativePath: string): string {
  return join(packageDir, 'assets', relativePath);
}
