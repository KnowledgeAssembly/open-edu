import { importLearnEasy } from '@open-edu/core';
import type { CliResult } from '../utils/json-output.js';

export async function importLearnEasyCommand(
  sourceDir: string,
  outputDir: string,
  options: { bundleTitle?: string; bundleId?: string; json?: boolean },
): Promise<CliResult> {
  try {
    const result = await importLearnEasy({
      sourceDir,
      outputDir,
      bundleTitle: options.bundleTitle,
      bundleId: options.bundleId,
    });
    return {
      success: true,
      data: {
        ...result,
        message: `Imported ${result.moduleCount} modules (${result.nodeCount} nodes) into ${result.bundleDir}`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      code: 1,
    };
  }
}
