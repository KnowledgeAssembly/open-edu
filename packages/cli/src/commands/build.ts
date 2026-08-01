import { existsSync, mkdirSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatBuildSuccess, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';
import {
  collectFiles,
  generateBuildManifest,
  writeBuildManifest,
} from '../utils/build-manifest.js';
import { createLogger } from '@open-edu/logger';

const logger = createLogger({ scope: 'cli:build' });

export async function buildPackage(
  packageDir: string,
  outDir?: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  logger.info('Building package', { packageDir, outDir: outDir ?? null });
  try {
    const pkg = await loadPackage(packageDir);
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

    const manifest = generateBuildManifest(pkg, files);
    writeBuildManifest(outputDir, manifest);

    if (options?.json) {
      return {
        success: true,
        data: {
          outputPath: outputDir,
          manifest: {
            id: pkg.manifest.id,
            title: pkg.manifest.title,
            version: pkg.manifest.version,
          },
        },
      };
    }
    const messages = formatBuildSuccess(outputDir);
    printMessages(messages);
    logger.info('Package built', { packageDir, outputDir });
    return { success: true, data: {} };
  } catch (error) {
    logger.error('Package build failed', { packageDir, error: String(error) });
    if (options?.json) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 1,
      };
    }
    const messages = formatValidationError(error);
    printMessages(messages);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 1,
    };
  }
}
