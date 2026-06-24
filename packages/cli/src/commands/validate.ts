import { loadPackage } from '@open-edu/core';
import { formatValidationSuccess, formatValidationError, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';

export async function validatePackage(packageDir: string, options?: { json?: boolean }): Promise<CliResult> {
  try {
    const pkg = await loadPackage(packageDir);
    if (options?.json) {
      return {
        success: true,
        data: {
          valid: true,
          title: pkg.manifest.title,
          version: pkg.manifest.version,
          author: pkg.manifest.author,
          entry: pkg.manifest.entry,
          nodes: pkg.nodes.length,
          workflow: pkg.workflow ? { routes: Object.keys(pkg.workflow.routing).length } : null,
          rewards: pkg.rewards ? { triggers: pkg.rewards.triggers.length } : null,
          assets: pkg.assetPaths.length,
        },
      };
    }
    const messages = formatValidationSuccess(pkg);
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
    return { success: false, error: error instanceof Error ? error.message : String(error), code: 1 };
  }
}
