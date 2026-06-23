import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { loadPackage } from '@open-edu/core';
import { formatValidationError, formatPackageSuccess, printMessages } from '../utils/format';

function isTarAvailable(): boolean {
  try {
    execSync('tar --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export async function packagePackage(packageDir: string, outputDir?: string): Promise<number> {
  try {
    const pkg = await loadPackage(packageDir);
    const outDir = outputDir ?? process.cwd();
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const archiveName = `${pkg.manifest.id}-${pkg.manifest.version}.tar.gz`;
    const archivePath = resolve(join(outDir, archiveName));

    if (!isTarAvailable()) {
      printMessages([
        { type: 'error', text: 'tar command not found. Install tar or use edu build instead.' },
      ]);
      return 1;
    }

    const excludeOpts = ["--exclude='dist'", "--exclude='node_modules'", "--exclude='.git'"].join(
      ' ',
    );

    const cmd = `tar -czf ${archivePath} ${excludeOpts} -C ${packageDir} .`;
    execSync(cmd, { stdio: 'ignore', timeout: 30000 });

    const messages = formatPackageSuccess(archivePath);
    printMessages(messages);
    return 0;
  } catch (error) {
    const messages = formatValidationError(error);
    printMessages(messages);
    return 1;
  }
}
