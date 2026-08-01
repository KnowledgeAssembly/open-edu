import { readFile, access } from 'node:fs/promises';
import { applyPatch } from '@open-edu/core';
import type { PatchOperation } from '@open-edu/core';
import type { CliResult } from '../utils/json-output.js';
import { createLogger } from '@open-edu/logger';

const logger = createLogger({ scope: 'cli:patch' });

export async function patchPackage(
  packageDir: string,
  patchFilePath: string,
  options?: { json?: boolean; dryRun?: boolean },
): Promise<CliResult> {
  logger.info('Applying patch', { packageDir, patchFilePath, dryRun: options?.dryRun });
  try {
    await access(patchFilePath);
  } catch {
    const msg = `Patch file not found: ${patchFilePath}`;
    logger.error(msg);
    if (options?.json) {
      return { success: false, error: msg, code: 1 };
    }
    console.error(msg);
    return { success: false, error: msg, code: 1 };
  }

  let operations: PatchOperation[];
  try {
    const content = await readFile(patchFilePath, 'utf-8');
    operations = JSON.parse(content);
    if (!Array.isArray(operations)) {
      throw new Error('Patch file must contain a JSON array of operations');
    }
  } catch (err) {
    const msg = `Failed to parse patch file: ${err instanceof Error ? err.message : String(err)}`;
    logger.error(msg);
    if (options?.json) {
      return { success: false, error: msg, code: 1 };
    }
    console.error(msg);
    return { success: false, error: msg, code: 1 };
  }

  try {
    const report = await applyPatch(packageDir, operations, { dryRun: options?.dryRun });

    if (options?.json) {
      if (report.validationResult.valid) {
        return { success: true, data: report as unknown as Record<string, unknown> };
      }
      return {
        success: false,
        error: report.validationResult.error ?? 'Validation failed',
        code: 1,
      };
    }

    for (const line of report.diffSummary) {
      console.log(line);
    }

    if (!report.validationResult.valid) {
      console.error(`\nPatch FAILED: ${report.validationResult.error}`);
      return { success: false, error: report.validationResult.error!, code: 1 };
    }

    console.log(`\nPatch applied successfully. ${report.operations.length} operation(s).`);
    logger.info('Patch applied', { packageDir, operationCount: report.operations.length });
    return { success: true, data: { operations: report.operations.length } };
  } catch (error) {
    const msg = `Patch error: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(msg);
    if (options?.json) {
      return { success: false, error: msg, code: 1 };
    }
    console.error(msg);
    return { success: false, error: msg, code: 1 };
  }
}
