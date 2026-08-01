import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatPackageSuccess, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';
import {
  collectFiles,
  generateBuildManifest,
  writeBuildManifest,
} from '../utils/build-manifest.js';
import * as tar from 'tar';
import { createLogger } from '@open-edu/logger';

const MANIFEST_FILE = 'open-edu-build.json';

const logger = createLogger({ scope: 'cli:package' });

export async function packagePackage(
  packageDir: string,
  outputDir?: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  logger.info('Packaging package', { packageDir, outputDir: outputDir ?? null });
  try {
    const pkg = await loadPackage(packageDir);
    const outDir = outputDir ?? process.cwd();
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const archiveName = `${pkg.manifest.id}-${pkg.manifest.version}.tar.gz`;
    const archivePath = resolve(join(outDir, archiveName));

    const files = collectFiles(packageDir, packageDir);
    const manifest = generateBuildManifest(pkg, files);
    writeBuildManifest(packageDir, manifest);

    await new Promise<void>((resolvePromise, reject) => {
      tar
        .c(
          {
            gzip: true,
            cwd: packageDir,
            filter: (path: string) => {
              const topLevel = path.split('/')[0];
              return topLevel !== 'dist' && topLevel !== 'node_modules' && topLevel !== '.git';
            },
          },
          ['.'],
        )
        .pipe(createWriteStream(archivePath))
        .on('finish', resolvePromise)
        .on('error', reject);
    });

    const manifestPath = join(packageDir, MANIFEST_FILE);
    if (existsSync(manifestPath)) {
      unlinkSync(manifestPath);
    }

    if (options?.json) {
      return {
        success: true,
        data: {
          packageDir,
          generatedFiles: [archivePath],
        },
      };
    }
    const messages = formatPackageSuccess(archivePath);
    printMessages(messages);
    logger.info('Package archived', { packageDir, archivePath });
    return { success: true, data: {} };
  } catch (error) {
    logger.error('Package archiving failed', { packageDir, error: String(error) });
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
