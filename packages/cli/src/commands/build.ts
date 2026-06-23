import { existsSync, mkdirSync, readdirSync, statSync, cpSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatBuildSuccess, printMessages } from '../utils/format.js';

const EXCLUDED_DIRS = new Set(['dist', 'node_modules', '.git']);

function collectFiles(dir: string, rootDir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const relPath = relative(rootDir, fullPath);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectFiles(fullPath, rootDir));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

export async function buildPackage(packageDir: string, outDir?: string): Promise<number> {
  try {
    await loadPackage(packageDir);
    const outputDir = outDir ?? join(packageDir, 'dist');

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const files = collectFiles(packageDir, packageDir);
    for (const file of files) {
      const srcPath = join(packageDir, file);
      const destPath = join(outputDir, file);
      const destDir = join(destPath, '..');
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      cpSync(srcPath, destPath);
    }

    const messages = formatBuildSuccess(outputDir);
    printMessages(messages);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
