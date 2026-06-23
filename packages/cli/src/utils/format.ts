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

function bold(text: string): string {
  return color(text, '\x1b[1m');
}

function dim(text: string): string {
  return color(text, '\x1b[2m');
}

const CHECK = '\u2713';
const CROSS = '\u2717';

export interface ValidationMessage {
  type: 'success' | 'error' | 'info';
  text: string;
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

export function formatValidationError(error: unknown): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    { type: 'error', text: `${red(CROSS)} Package validation failed` },
  ];

  if (error instanceof PackageLoadError) {
    const zodErr = error as ManifestValidationError &
      WorkflowValidationError &
      RewardsValidationError;
    messages.push({ type: 'error', text: `  ${bold(error.code)}: ${error.message}` });
    if (zodErr.zodError?.issues) {
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
    { type: 'info', text: '' },
    { type: 'info', text: dim('  Dev server coming in Epic 10.') },
    { type: 'info', text: dim('  Use `edu validate` to check your package for now.') },
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

export function printMessages(messages: ValidationMessage[]): void {
  for (const m of messages) {
    if (m.type === 'success') console.log(m.text);
    else if (m.type === 'error') console.error(m.text);
    else console.log(m.text);
  }
}
