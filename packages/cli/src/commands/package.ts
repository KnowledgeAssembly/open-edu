import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatPackageSuccess, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';
import * as tar from 'tar';

export async function packagePackage(
  packageDir: string,
  outputDir?: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  try {
    const pkg = await loadPackage(packageDir);
    const outDir = outputDir ?? process.cwd();
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const archiveName = `${pkg.manifest.id}-${pkg.manifest.version}.tar.gz`;
    const archivePath = resolve(join(outDir, archiveName));

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
    return { success: true, data: {} };
  } catch (error) {
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
