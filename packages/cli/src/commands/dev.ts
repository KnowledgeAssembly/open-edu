import { loadPackage } from '@open-edu/core';
import { startDevServer } from '@open-edu/dev-server';
import { formatValidationError, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';

export async function devPackage(
  packageDir: string,
  options?: { json?: boolean },
): Promise<CliResult> {
  try {
    const pkg = await loadPackage(packageDir);

    if (options?.json) {
      await startDevServer(packageDir);
      return {
        success: true,
        data: {
          title: pkg.manifest.title,
          version: pkg.manifest.version,
          serverUrl: 'http://localhost:4000',
        },
      };
    }

    console.log(`Starting dev server for "${pkg.manifest.title}" (${pkg.manifest.version})`);
    console.log(`  Nodes: ${pkg.nodes.length}`);
    console.log('');

    await startDevServer(packageDir);
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
