import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatPackageSuccess, printMessages } from '../utils/format.js';
import * as tar from 'tar';

export async function packagePackage(packageDir: string, outputDir?: string): Promise<number> {
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
              return (
                topLevel !== 'dist' &&
                topLevel !== 'node_modules' &&
                topLevel !== '.git'
              );
            },
          },
          ['.'],
        )
        .pipe(createWriteStream(archivePath))
        .on('finish', resolvePromise)
        .on('error', reject);
    });

    const messages = formatPackageSuccess(archivePath);
    printMessages(messages);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
