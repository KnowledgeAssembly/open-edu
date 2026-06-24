import type { LoadedPackage } from '@open-edu/core';
import { PackageLoadError } from '@open-edu/core';
import type {
  ManifestValidationError,
  WorkflowValidationError,
  RewardsValidationError,
} from '@open-edu/core';

const isTTY = process.stdout.isTTY;

function color(text: string, code: string): string {
  return isTTY ? `${code}${text}\x1b[0m` : text;
}

function green(text: string): string {
  return color(text, '\x1b[32m');
}

function red(text: string): string {
  return color(text, '\x1b[31m');
}

function yellow(text: string): string {
  return color(text, '\x1b[33m');
}

function bold(text: string): string {
  return color(text, '\x1b[1m');
}

function dim(text: string): string {
  return color(text, '\x1b[2m');
}

const CHECK = '\u2713';
const CROSS = '\u2717';

export interface ValidationMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

export interface DiagnosticBlock {
  file: string;
  path?: string;
  problem: string;
  suggestion?: string;
}

export function formatValidationSuccess(pkg: LoadedPackage): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    {
      type: 'success',
      text: `${green(CHECK)} Package "${pkg.manifest.title}" (${pkg.manifest.version}) is valid`,
    },
    { type: 'info', text: `  Author: ${pkg.manifest.author}` },
    { type: 'info', text: `  Entry: ${pkg.manifest.entry}` },
    { type: 'info', text: `  Nodes: ${pkg.nodes.length}` },
    {
      type: 'info',
      text: `  Workflow: ${pkg.workflow ? `yes (${Object.keys(pkg.workflow.routing).length} routes)` : 'no'}`,
    },
    {
      type: 'info',
      text: `  Rewards: ${pkg.rewards ? `yes (${pkg.rewards.triggers.length} triggers)` : 'no'}`,
    },
    {
      type: 'info',
      text: `  Assets: ${pkg.assetPaths.length} file${pkg.assetPaths.length === 1 ? '' : 's'}`,
    },
  ];
  return messages;
}

function formatDiagnosticBlock(diag: DiagnosticBlock): string[] {
  const lines: string[] = [];
  lines.push(`  ${bold('File:')} ${diag.file}`);
  if (diag.path) {
    lines.push(`  ${bold('Path:')} ${diag.path}`);
  }
  lines.push(`  ${bold('Problem:')} ${diag.problem}`);
  if (diag.suggestion) {
    lines.push(`  ${bold('Suggested fix:')} ${diag.suggestion}`);
  }
  return lines;
}

function getZodDiagnostics(
  error: ManifestValidationError | WorkflowValidationError | RewardsValidationError,
): DiagnosticBlock[] {
  const blocks: DiagnosticBlock[] = [];
  if (error.zodError?.issues) {
    const file = error.file ?? 'unknown';
    for (const issue of error.zodError.issues) {
      blocks.push({
        file,
        path: issue.path.length > 0 ? issue.path.join('.') : undefined,
        problem: issue.message,
        suggestion: error.suggestion,
      });
    }
  }
  return blocks;
}

function getLoadErrorDiagnostics(error: PackageLoadError): DiagnosticBlock[] {
  if ('zodError' in error && error.zodError) {
    return getZodDiagnostics(
      error as ManifestValidationError | WorkflowValidationError | RewardsValidationError,
    );
  }
  return [
    {
      file: error.file ?? 'package file',
      path: error.path,
      problem: error.message,
      suggestion: error.suggestion,
    },
  ];
}

export function formatValidationError(error: unknown): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    { type: 'error', text: `${red(CROSS)} Package validation failed` },
  ];

  if (error instanceof PackageLoadError) {
    const zodErr = error as ManifestValidationError &
      WorkflowValidationError &
      RewardsValidationError;
    messages.push({ type: 'error', text: `  ${bold(error.code)}: ${error.message}` });

    const diagnostics = getLoadErrorDiagnostics(error);
    for (const diag of diagnostics) {
      for (const line of formatDiagnosticBlock(diag)) {
        messages.push({ type: 'error', text: line });
      }
    }

    if (zodErr.zodError?.issues && !error.file) {
      for (const issue of zodErr.zodError.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') + ': ' : '';
        messages.push({ type: 'error', text: `    - ${path}${issue.message}` });
      }
    }
  } else if (error instanceof Error) {
    messages.push({ type: 'error', text: `  ${error.message}` });
  } else {
    messages.push({ type: 'error', text: `  Unknown error: ${String(error)}` });
  }

  return messages;
}

export function formatDevMessage(pkg: LoadedPackage): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    {
      type: 'success',
      text: `${green(CHECK)} Package "${pkg.manifest.title}" validated successfully`,
    },
    { type: 'info', text: `  Nodes: ${pkg.nodes.length}` },
    {
      type: 'info',
      text: `  Workflow: ${pkg.workflow ? `yes (${Object.keys(pkg.workflow.routing).length} routes)` : 'no'}`,
    },
    { type: 'info', text: '' },
    { type: 'info', text: dim('  Starting dev server on http://localhost:4000') },
  ];
  return messages;
}

export function formatBuildSuccess(outDir: string): ValidationMessage[] {
  return [
    { type: 'success', text: `${green(CHECK)} Package built successfully` },
    { type: 'info', text: `  Output: ${outDir}` },
  ];
}

export function formatPackageSuccess(archivePath: string): ValidationMessage[] {
  return [
    { type: 'success', text: `${green(CHECK)} Package archive created` },
    { type: 'info', text: `  Archive: ${archivePath}` },
  ];
}

export function formatLintResults(warnings: number, errors: number): ValidationMessage[] {
  const messages: ValidationMessage[] = [];
  if (warnings === 0 && errors === 0) {
    messages.push({ type: 'success', text: `${green(CHECK)} No content issues found` });
  }
  if (warnings > 0) {
    messages.push({
      type: 'warning',
      text: `${yellow('!')} ${warnings} warning${warnings === 1 ? '' : 's'} found`,
    });
  }
  if (errors > 0) {
    messages.push({
      type: 'error',
      text: `${red(CROSS)} ${errors} error${errors === 1 ? '' : 's'} found`,
    });
  }
  return messages;
}

export function printMessages(messages: ValidationMessage[]): void {
  for (const m of messages) {
    if (m.type === 'success' || m.type === 'info') console.log(m.text);
    else if (m.type === 'warning') console.warn(m.text);
    else console.error(m.text);
  }
}
