import { importLearnEasy } from '@open-edu/core';
import type { CliResult } from '../utils/json-output.js';
import { createLogger } from '@open-edu/logger';

const logger = createLogger({ scope: 'cli:import' });

export async function importLearnEasyCommand(
  sourceDir: string,
  outputDir: string,
  options: { bundleTitle?: string; bundleId?: string; json?: boolean },
): Promise<CliResult> {
  logger.info('Importing Learn-Easy content', { sourceDir, outputDir });
  try {
    const result = await importLearnEasy({
      sourceDir,
      outputDir,
      bundleTitle: options.bundleTitle,
      bundleId: options.bundleId,
    });
    logger.info('Learn-Easy import complete', {
      sourceDir,
      bundleDir: result.bundleDir,
      moduleCount: result.moduleCount,
    });
    return {
      success: true,
      data: {
        ...result,
        message: `Imported ${result.moduleCount} modules (${result.nodeCount} nodes) into ${result.bundleDir}`,
      },
    };
  } catch (err) {
    logger.error('Learn-Easy import failed', { sourceDir, error: String(err) });
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      code: 1,
    };
  }
}
