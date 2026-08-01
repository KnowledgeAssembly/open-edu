import { readFile, writeFile, access, mkdir, unlink } from 'node:fs/promises';
import { join, dirname, sep } from 'node:path';
import { loadPackage } from './loader.js';
import { corePatcherLogger } from './logger.js';

export type PatchOperation =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'upsert-node'; nodeId: string; content: string | Record<string, unknown> }
  | { op: 'remove-node'; nodeId: string };

export interface PatchOperationResult {
  op: string;
  path?: string;
  nodeId?: string;
  status: 'applied' | 'skipped';
  detail?: string;
}

export interface PatchReport {
  operations: PatchOperationResult[];
  validationResult: { valid: boolean; error?: string };
  diffSummary: string[];
}

function parseJsonPointerPath(path: string): { filePath: string; pointerSegments: string[] } {
  if (path.includes('//')) {
    throw new Error(`Invalid path: "${path}" — empty segments are not allowed`);
  }
  const segments = path.split('/').filter(Boolean);
  const filePath = segments[0];
  if (!filePath) {
    throw new Error(`Invalid path: "${path}" — first segment must be a filename`);
  }
  const pointerSegments = segments.slice(1).map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'));
  for (const seg of pointerSegments) {
    if (seg === '-') {
      throw new Error(
        `Array append token "-" is not supported in path "${path}" — use explicit array index instead`,
      );
    }
  }
  return { filePath, pointerSegments };
}

function getNestedValue(
  obj: Record<string, unknown>,
  segments: string[],
): { parent: Record<string, unknown>; key: string; exists: boolean } | null {
  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (typeof current !== 'object' || current === null) return null;
    const next = (current as Record<string, unknown>)[segments[i]!];
    if (next === undefined) return null;
    current = next;
  }
  const lastKey = segments[segments.length - 1]!;
  if (segments.length === 1) {
    return { parent: obj, key: lastKey, exists: lastKey in obj };
  }
  if (typeof current !== 'object' || current === null) return null;
  const parent = current as Record<string, unknown>;
  return { parent, key: lastKey, exists: lastKey in parent };
}

function ensureNestedParent(
  obj: Record<string, unknown>,
  segments: string[],
): { parent: Record<string, unknown>; key: string } {
  let parent: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (seg === '-') {
      throw new Error('Array append token "-" is not supported — use explicit array index instead');
    }
    const child = parent[seg];
    if (child === undefined || typeof child !== 'object' || child === null) {
      const newObj: Record<string, unknown> = {};
      parent[seg] = newObj;
      parent = newObj;
    } else {
      parent = child as Record<string, unknown>;
    }
  }
  return { parent, key: segments[segments.length - 1]! };
}

function deleteNestedValue(obj: Record<string, unknown>, segments: string[]): boolean {
  const result = getNestedValue(obj, segments);
  if (!result || !result.exists) return false;
  delete result.parent[result.key];

  let current = result.parent;
  for (let i = segments.length - 2; i >= 0; i--) {
    if (current !== null && typeof current === 'object' && Object.keys(current).length === 0) {
      const parentResult = getNestedValue(obj, segments.slice(0, i + 1));
      if (parentResult && parentResult.exists) {
        delete parentResult.parent[parentResult.key];
        current = parentResult.parent;
      }
    } else {
      break;
    }
  }

  return true;
}

function toDiffLine(op: string, filePath?: string, nodeId?: string, detail?: string): string {
  if (nodeId) {
    if (op === 'upsert-node') return `  + upsert node: ${nodeId}${detail ? ` (${detail})` : ''}`;
    if (op === 'remove-node') return `  - remove node: ${nodeId}`;
  }
  if (filePath) {
    const symbol = op === 'add' ? '+' : op === 'remove' ? '-' : '~';
    return `  ${symbol} ${filePath}${detail ? ` (${detail})` : ''}`;
  }
  return `  ? ${op}`;
}

function normalizeNodeId(nodeId: string): string {
  const normalized = nodeId.startsWith('nodes/') ? nodeId : `nodes/${nodeId}`;
  return normalized.split(sep).join('/');
}

async function readJson(dir: string, filePath: string): Promise<Record<string, unknown>> {
  const fullPath = join(dir, filePath);
  await access(fullPath);
  const content = await readFile(fullPath, 'utf-8');
  return JSON.parse(content) as Record<string, unknown>;
}

async function writeJson(
  dir: string,
  filePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const fullPath = join(dir, filePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

interface BackupEntry {
  kind: 'json-content';
  path: string;
  content: string;
}

interface JsonWrittenEntry {
  kind: 'json-written';
  path: string;
  hadOriginal: boolean;
}

interface NodeWrittenEntry {
  kind: 'node-written';
  path: string;
  hadOriginal: boolean;
  originalContent?: string;
}

interface NodeDeletedEntry {
  kind: 'node-deleted';
  path: string;
  content: string;
}

type ChangeEntry = JsonWrittenEntry | NodeWrittenEntry | NodeDeletedEntry;

export async function applyPatch(
  packageDir: string,
  operations: PatchOperation[],
  options?: { dryRun?: boolean },
): Promise<PatchReport> {
  corePatcherLogger.info('Applying patch...', {
    packageDir,
    operationCount: operations.length,
    dryRun: options?.dryRun ?? false,
  });
  corePatcherLogger.time('apply-patch');

  const results: PatchOperationResult[] = [];
  const diffSummary: string[] = ['Patch operations:'];
  const backups: BackupEntry[] = [];
  const appliedChanges: ChangeEntry[] = [];

  const filesToWrite = new Map<string, Record<string, unknown>>();
  const nodesToWrite = new Map<string, string>();
  const nodesToDelete = new Set<string>();

  for (const op of operations) {
    switch (op.op) {
      case 'add':
      case 'replace':
      case 'remove': {
        const { filePath, pointerSegments } = parseJsonPointerPath(op.path);

        let data: Record<string, unknown>;
        const havePending = filesToWrite.has(filePath);
        if (havePending) {
          data = { ...filesToWrite.get(filePath)! };
        } else {
          try {
            data = await readJson(packageDir, filePath);
          } catch {
            if (op.op === 'add') {
              data = {};
            } else {
              results.push({
                op: op.op,
                path: op.path,
                status: 'skipped',
                detail: `File not found: ${filePath}`,
              });
              diffSummary.push(toDiffLine(op.op, filePath, undefined, 'SKIPPED (file not found)'));
              continue;
            }
          }
        }

        if (op.op === 'add') {
          const existing = getNestedValue(data, pointerSegments);
          if (existing && existing.exists) {
            results.push({
              op: 'add',
              path: op.path,
              status: 'skipped',
              detail: 'Field already exists',
            });
            diffSummary.push(toDiffLine(op.op, filePath, undefined, 'SKIPPED (already exists)'));
            continue;
          }
          const parent = ensureNestedParent(data, pointerSegments);
          parent.parent[parent.key] = op.value;
          results.push({ op: 'add', path: op.path, status: 'applied' });
        } else if (op.op === 'replace') {
          const existing = getNestedValue(data, pointerSegments);
          if (!existing || !existing.exists) {
            results.push({
              op: 'replace',
              path: op.path,
              status: 'skipped',
              detail: 'Field does not exist',
            });
            diffSummary.push(toDiffLine(op.op, filePath, undefined, 'SKIPPED (field not found)'));
            continue;
          }
          existing.parent[existing.key] = op.value;
          results.push({ op: 'replace', path: op.path, status: 'applied' });
        } else if (op.op === 'remove') {
          const removed = deleteNestedValue(data, pointerSegments);
          if (!removed) {
            results.push({
              op: 'remove',
              path: op.path,
              status: 'skipped',
              detail: 'Field does not exist',
            });
            diffSummary.push(toDiffLine(op.op, filePath, undefined, 'SKIPPED (field not found)'));
            continue;
          }
          results.push({ op: 'remove', path: op.path, status: 'applied' });
        }

        filesToWrite.set(filePath, data);
        diffSummary.push(toDiffLine(op.op, filePath));
        break;
      }

      case 'upsert-node': {
        const normalizedId = normalizeNodeId(op.nodeId);
        const content =
          typeof op.content === 'string' ? op.content : JSON.stringify(op.content, null, 2) + '\n';
        nodesToWrite.set(normalizedId, content);
        results.push({ op: 'upsert-node', nodeId: normalizedId, status: 'applied' });
        diffSummary.push(toDiffLine('upsert-node', undefined, normalizedId));
        break;
      }

      case 'remove-node': {
        const normalizedId = normalizeNodeId(op.nodeId);
        nodesToDelete.add(normalizedId);
        results.push({ op: 'remove-node', nodeId: normalizedId, status: 'applied' });
        diffSummary.push(toDiffLine('remove-node', undefined, normalizedId));

        const workflowPath = 'workflow.json';
        try {
          let workflowData: Record<string, unknown>;
          if (filesToWrite.has(workflowPath)) {
            workflowData = { ...filesToWrite.get(workflowPath)! };
          } else {
            workflowData = await readJson(packageDir, workflowPath);
          }
          const routing = workflowData['routing'] as Record<string, unknown> | undefined;
          if (routing && typeof routing === 'object' && normalizedId in routing) {
            delete routing[normalizedId];
            filesToWrite.set(workflowPath, workflowData);
            results.push({
              op: 'remove',
              path: `/workflow.json/routing/${normalizedId.replace(/\//g, '~1')}`,
              status: 'applied',
              detail: `Removed workflow reference to ${normalizedId}`,
            });
            diffSummary.push(`  - workflow.json reference to ${normalizedId}`);
          }
        } catch {
          // no workflow to clean up
        }
        break;
      }
    }
  }

  if (options?.dryRun) {
    return {
      operations: results,
      validationResult: { valid: true },
      diffSummary,
    };
  }

  // Backup original files before modifying
  for (const [filePath] of filesToWrite) {
    const fullPath = join(packageDir, filePath);
    try {
      const original = await readFile(fullPath, 'utf-8');
      backups.push({ kind: 'json-content', path: filePath, content: original });
    } catch {
      // file doesn't exist yet (new file via 'add')
    }
  }

  // Backup original node files that will be deleted or overwritten
  for (const nodeId of nodesToDelete) {
    const fullPath = join(packageDir, nodeId);
    try {
      const content = await readFile(fullPath, 'utf-8');
      backups.push({ kind: 'json-content', path: nodeId, content });
    } catch {
      // file doesn't exist
    }
  }

  for (const [nodeId] of nodesToWrite) {
    const fullPath = join(packageDir, nodeId);
    try {
      const content = await readFile(fullPath, 'utf-8');
      backups.push({ kind: 'json-content', path: nodeId, content });
    } catch {
      // new file
    }
  }

  // Apply changes
  for (const [filePath, data] of filesToWrite) {
    await writeJson(packageDir, filePath, data);
    appliedChanges.push({
      kind: 'json-written',
      path: filePath,
      hadOriginal: backups.some((b) => b.kind === 'json-content' && b.path === filePath),
    });
  }

  for (const [nodeId, content] of nodesToWrite) {
    const fullPath = join(packageDir, nodeId);
    const hadOriginal = backups.some((b) => b.kind === 'json-content' && b.path === nodeId);
    const originalContent = backups.find(
      (b) => b.kind === 'json-content' && b.path === nodeId,
    )?.content;
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
    appliedChanges.push({ kind: 'node-written', path: nodeId, hadOriginal, originalContent });
  }

  for (const nodeId of nodesToDelete) {
    const fullPath = join(packageDir, nodeId);
    const backup = backups.find((b) => b.kind === 'json-content' && b.path === nodeId);
    appliedChanges.push({
      kind: 'node-deleted',
      path: nodeId,
      content: backup?.content ?? '',
    });
    try {
      await unlink(fullPath);
    } catch {
      // file might not exist
    }
  }

  // Validate
  try {
    await loadPackage(packageDir);
    corePatcherLogger.timeEnd('apply-patch');
    corePatcherLogger.info('Patch applied and validated', {
      packageDir,
      appliedCount: results.filter((r) => r.status === 'applied').length,
    });
    return {
      operations: results,
      validationResult: { valid: true },
      diffSummary: [...diffSummary, '', 'Validation: PASSED'],
    };
  } catch (error) {
    // Revert all changes from backups
    const errors: string[] = [];
    for (const change of appliedChanges) {
      try {
        if (change.kind === 'json-written') {
          const backup = backups.find((b) => b.kind === 'json-content' && b.path === change.path);
          if (backup) {
            await writeFile(join(packageDir, change.path), backup.content, 'utf-8');
          } else {
            // Was a new file — delete it
            const fullPath = join(packageDir, change.path);
            try {
              await unlink(fullPath);
            } catch {
              // ignore
            }
          }
        } else if (change.kind === 'node-written') {
          if (change.hadOriginal && change.originalContent) {
            await writeFile(join(packageDir, change.path), change.originalContent, 'utf-8');
          } else {
            // Was a new node — delete it
            const fullPath = join(packageDir, change.path);
            try {
              await unlink(fullPath);
            } catch {
              // ignore
            }
          }
        } else if (change.kind === 'node-deleted') {
          if (change.content) {
            await mkdir(dirname(join(packageDir, change.path)), { recursive: true });
            await writeFile(join(packageDir, change.path), change.content, 'utf-8');
          }
        }
      } catch (e) {
        errors.push(
          `Failed to revert ${change.path}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    corePatcherLogger.timeEnd('apply-patch');
    corePatcherLogger.error('Patch validation failed — changes reverted', error, {
      packageDir,
    });

    return {
      operations: results,
      validationResult: {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      },
      diffSummary: [
        ...diffSummary,
        '',
        `Validation: FAILED — ${error instanceof Error ? error.message : String(error)}`,
        'All changes have been reverted.',
        ...(errors.length > 0 ? [`Revert errors: ${errors.join('; ')}`] : []),
      ],
    };
  }
}
