import { loadPackage, lintPackage, type LintResult } from '@open-edu/core';
import { formatLintResults, printMessages } from '../utils/format.js';
import type { CliResult } from '../utils/json-output.js';

export interface LintContentOptions {
  json?: boolean;
  maxWarnings?: number;
}

export async function lintContent(
  packageDir: string,
  options?: LintContentOptions,
): Promise<CliResult> {
  try {
    const pkg = await loadPackage(packageDir);
    const result: LintResult = lintPackage(pkg);

    if (options?.json) {
      const maxWarningsVal = options.maxWarnings ?? Infinity;
      const isValid = result.errors.length === 0 && result.warnings.length <= maxWarningsVal;
      if (isValid) {
        return {
          success: true,
          data: {
            valid: true,
            warnings: result.warnings.map((w) => ({
              file: w.file,
              message: w.message,
              detail: w.detail,
            })),
            errors: result.errors.map((e) => ({
              file: e.file,
              message: e.message,
              detail: e.detail,
            })),
            warningCount: result.warnings.length,
            errorCount: result.errors.length,
          },
        };
      }
      return {
        success: false,
        error:
          result.errors.length > 0
            ? `${result.errors.length} content error(s) found`
            : `Warning count ${result.warnings.length} exceeds max-warnings ${maxWarningsVal}`,
        code: 1,
      };
    }

    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.warn(`  ! ${w.file}: ${w.message}`);
        if (w.detail) console.warn(`    ${w.detail}`);
      }
    }

    if (result.errors.length > 0) {
      for (const e of result.errors) {
        console.error(`  \u2717 ${e.file}: ${e.message}`);
        if (e.detail) console.error(`    ${e.detail}`);
      }
    }

    const messages = formatLintResults(result.warnings.length, result.errors.length);
    printMessages(messages);

    const maxWarnings = options?.maxWarnings ?? Infinity;
    if (result.errors.length > 0) {
      return { success: false, error: `${result.errors.length} content error(s) found`, code: 1 };
    }
    if (result.warnings.length > maxWarnings) {
      return {
        success: false,
        error: `Warning count ${result.warnings.length} exceeds max-warnings ${maxWarnings}`,
        code: 1,
      };
    }

    return { success: true, data: { warningCount: result.warnings.length } };
  } catch (error) {
    if (options?.json) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        code: 1,
      };
    }
    console.error(
      `\u2717 Content lint failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      code: 1,
    };
  }
}
