import { readFile, access } from 'node:fs/promises';
import { applyPatch } from '@open-edu/core';
import type { PatchOperation } from '@open-edu/core';
import type { CliResult } from '../utils/json-output.js';

export async function patchPackage(
  packageDir: string,
  patchFilePath: string,
  options?: { json?: boolean; dryRun?: boolean },
): Promise<CliResult> {
  try {
    await access(patchFilePath);
  } catch {
    const msg = `Patch file not found: ${patchFilePath}`;
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
    return { success: true, data: { operations: report.operations.length } };
  } catch (error) {
    const msg = `Patch error: ${error instanceof Error ? error.message : String(error)}`;
    if (options?.json) {
      return { success: false, error: msg, code: 1 };
    }
    console.error(msg);
    return { success: false, error: msg, code: 1 };
  }
}
