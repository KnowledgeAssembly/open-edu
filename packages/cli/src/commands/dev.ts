import { existsSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { loadPackage, type LoadedPackage } from '@open-edu/core';
import { startDevServer } from '@open-edu/dev-server';
import { formatValidationError, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';
import { createLogger } from '@open-edu/logger';

const logger = createLogger({ scope: 'cli:dev' });

export async function devPackage(
  packageDir: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  logger.info('Starting dev server', { packageDir });
  try {
    if (!existsSync(packageDir) || !statSync(packageDir).isDirectory()) {
      throw new Error(`Directory does not exist: ${packageDir}`);
    }

    // A directory that isn't yet a complete package (e.g. an empty folder) is
    // still a valid Studio target: the user can create a course from a
    // template or with AI. Treat load failure as a warning, not a blocker.
    let pkg: LoadedPackage | null = null;
    try {
      pkg = await loadPackage(packageDir);
    } catch (error) {
      logger.warn('Directory is not a complete package yet; starting Studio anyway', {
        packageDir,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (pkg && !options?.json) {
      console.log(`Starting dev server for "${pkg.manifest.title}" (${pkg.manifest.version})`);
      console.log(`  Nodes: ${pkg.nodes.length}`);
      console.log('');
    } else if (!pkg && !options?.json) {
      console.log(`Starting dev server for empty directory: ${packageDir}`);
      console.log('  Create a course from a template or with AI in the Studio.');
      console.log('');
    }

    await startDevServer(packageDir);
    logger.info('Dev server started', { packageDir });

    if (options?.json) {
      return {
        success: true,
        data: {
          title: pkg?.manifest.title ?? basename(packageDir),
          version: pkg?.manifest.version ?? '0.0.0',
          serverUrl: 'http://localhost:4000',
        },
      };
    }

    return { success: true, data: {} };
  } catch (error) {
    logger.error('Dev server failed to start', { packageDir, error: String(error) });
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
