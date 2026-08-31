import {
  WorkspaceConflictError,
  WorkspaceNotFoundError,
  WorkspaceTransactionError,
  WorkspacePathError,
} from './errors.js';
import { assertSafeCoursePath } from './paths.js';
import type { CourseWorkspace } from './types.js';
import { walkWorkspace } from './walk.js';
import { createChangeSet, type WorkspaceChange, type WorkspaceChangeSet } from './change.js';
import { saveHistoryEntry, type HistoryEntry } from '../history-store.js';

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ path: string; error: string }>;
}

export interface CommitResult {
  success: boolean;
  changeSet: WorkspaceChangeSet;
  error?: string;
}

/** Write is intentionally binary-only (SPEC §29); callers encode text. */
export interface WorkspaceTransaction {
  write(path: string, data: Uint8Array): void;
  delete(path: string): void;
  move(from: string, to: string): void;
  preview(): Promise<WorkspaceChangeSet>;
  validate(): Promise<ValidationResult>;
  commit(): Promise<CommitResult>;
  rollback(): Promise<void>;
}

type PendingOp =
  | { kind: 'write'; path: string; data: Uint8Array }
  | { kind: 'delete'; path: string }
  | { kind: 'move'; from: string; to: string };

interface FileSnapshot {
  path: string;
  existed: boolean;
  data?: Uint8Array;
}

async function readFileSnapshot(ws: CourseWorkspace, path: string): Promise<FileSnapshot> {
  if (await ws.exists(path)) {
    try {
      return { path, existed: true, data: await ws.read(path) };
    } catch {
      // Path exists but is a directory; treat as absent at file granularity.
      return { path, existed: false };
    }
  }
  return { path, existed: false };
}

/**
 * Snapshot every file affected by a set of logical paths (files and their
 * directory descendants) so a mid-commit failure can restore prior state.
 */
async function snapshotPaths(ws: CourseWorkspace, logicalPaths: string[]): Promise<FileSnapshot[]> {
  const snapshots: FileSnapshot[] = [];
  const seen = new Set<string>();
  for (const raw of logicalPaths) {
    const path = assertSafeCoursePath(raw);
    if (seen.has(path)) continue;
    seen.add(path);
    if (await ws.exists(path)) {
      const stat = await ws.stat(path).catch(() => undefined);
      if (stat && stat.kind === 'directory') {
        const files = await walkWorkspace(ws, { excludePrefixes: [] });
        for (const file of files) {
          if (file.path !== path && !file.path.startsWith(`${path}/`)) continue;
          if (seen.has(file.path)) continue;
          seen.add(file.path);
          snapshots.push({ path: file.path, existed: true, data: file.data });
        }
        continue;
      }
      snapshots.push(await readFileSnapshot(ws, path));
    } else {
      snapshots.push({ path, existed: false });
    }
  }
  return snapshots;
}

async function restoreSnapshots(ws: CourseWorkspace, snapshots: FileSnapshot[]): Promise<void> {
  for (const snapshot of snapshots) {
    if (snapshot.existed && snapshot.data) {
      await ws.write(snapshot.path, snapshot.data);
    } else {
      if (await ws.exists(snapshot.path)) {
        await ws.delete(snapshot.path);
      }
    }
  }
}

export class WorkspaceTransactionImpl implements WorkspaceTransaction {
  private readonly ops: PendingOp[] = [];
  private readonly description: string;
  private readonly source: WorkspaceChangeSet['source'];
  private readonly workspaceId?: string;

  constructor(
    private readonly workspace: CourseWorkspace,
    options: {
      description?: string;
      source?: WorkspaceChangeSet['source'];
      workspaceId?: string;
      recordHistory?: boolean;
    } = {},
  ) {
    this.description = options.description ?? '';
    this.source = options.source ?? 'user';
    this.workspaceId = options.recordHistory === false ? undefined : options.workspaceId;
  }

  write(path: string, data: Uint8Array): void {
    const safe = assertSafeCoursePath(path);
    if (data.byteLength === 0 && path === '') {
      throw new WorkspacePathError('Path must not be empty');
    }
    this.ops.push({ kind: 'write', path: safe, data: new Uint8Array(data) });
  }

  delete(path: string): void {
    this.ops.push({ kind: 'delete', path: assertSafeCoursePath(path) });
  }

  move(from: string, to: string): void {
    const f = assertSafeCoursePath(from);
    const t = assertSafeCoursePath(to);
    if (f === '') throw new WorkspacePathError('Path must not be empty');
    if (f === t) throw new WorkspacePathError('Move source and destination are the same');
    this.ops.push({ kind: 'move', from: f, to: t });
  }

  /** Changes are collected in order; write + delete/move ordering is preserved. */
  private async buildChanges(): Promise<WorkspaceChange[]> {
    const changes: WorkspaceChange[] = [];
    for (const op of this.ops) {
      switch (op.kind) {
        case 'write': {
          const stat = await this.workspace.stat(op.path).catch(() => undefined);
          const previousContent =
            stat?.kind === 'file' ? await this.workspace.read(op.path) : undefined;
          changes.push({
            path: op.path,
            operation: previousContent ? 'update' : 'create',
            previousContent,
            newContent: new Uint8Array(op.data),
          });
          break;
        }
        case 'delete': {
          const stat = await this.workspace.stat(op.path).catch(() => undefined);
          if (!stat) {
            throw new WorkspaceNotFoundError(`File not found: ${op.path}`);
          }
          const previousContent =
            stat.kind === 'file' ? await this.workspace.read(op.path) : undefined;
          changes.push({
            path: op.path,
            operation: 'delete',
            previousContent,
          });
          break;
        }
        case 'move': {
          const fromStat = await this.workspace.stat(op.from).catch(() => undefined);
          if (!fromStat) throw new WorkspaceNotFoundError(`File not found: ${op.from}`);
          const prev = fromStat.kind === 'file' ? await this.workspace.read(op.from) : undefined;
          const toStat = await this.workspace.stat(op.to).catch(() => undefined);
          if (toStat) throw new WorkspaceConflictError(`Destination already exists: ${op.to}`);
          changes.push({
            path: op.to,
            operation: 'move',
            previousContent: prev,
            from: op.from,
            to: op.to,
          });
          break;
        }
      }
    }
    return changes;
  }

  async preview(): Promise<WorkspaceChangeSet> {
    const changes = await this.buildChanges();
    return createChangeSet(this.source, this.description, changes);
  }

  async validate(): Promise<ValidationResult> {
    const errors: Array<{ path: string; error: string }> = [];
    for (const op of this.ops) {
      const path = op.kind === 'move' ? op.from : op.path;
      const to = op.kind === 'move' ? op.to : undefined;
      if (path === '' || (to !== undefined && to === '')) {
        errors.push({ path: path || '', error: 'Path must not be empty' });
      }
      if (op.kind === 'move' && (to?.startsWith(`${path}/`) || path.startsWith(`${to}/`))) {
        errors.push({ path, error: 'Move targets a descendant of its source' });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private async recordHistory(changeSet: WorkspaceChangeSet): Promise<void> {
    if (!this.workspaceId) return;
    const entry: HistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      workspaceId: this.workspaceId,
      timestamp: changeSet.createdAt,
      source: changeSet.source,
      description: changeSet.description,
      changes: changeSet.changes.map((change) => ({
        path: change.path,
        operation: change.operation,
        previousContent: change.previousContent,
        newContent: change.newContent,
        from: change.from,
        to: change.to,
      })),
    };
    try {
      await saveHistoryEntry(entry);
    } catch {
      // History recording is best-effort; the canonical change is already done.
    }
  }

  async commit(): Promise<CommitResult> {
    const validation = await this.validate();
    if (!validation.valid) {
      return {
        success: false,
        changeSet: createChangeSet(this.source, this.description, []),
        error: validation.errors[0]?.error ?? 'Invalid transaction',
      };
    }

    let changeSet: WorkspaceChangeSet;
    try {
      changeSet = await this.preview();
    } catch (err) {
      // Broken references (e.g. deleting a missing file) are "failure before
      // commit": no canonical change was made.
      this.ops.length = 0;
      return {
        success: false,
        changeSet: createChangeSet(this.source, this.description, []),
        error: err instanceof Error ? err.message : String(err),
      };
    }
    const affected = this.ops
      .map((op) => (op.kind === 'move' ? [op.from, op.to] : [op.path]))
      .flat();
    const backup = await snapshotPaths(this.workspace, affected);

    try {
      for (const op of this.ops) {
        switch (op.kind) {
          case 'write':
            await this.workspace.write(op.path, op.data);
            break;
          case 'delete':
            await this.workspace.delete(op.path);
            break;
          case 'move':
            await this.workspace.move(op.from, op.to);
            break;
        }
      }
    } catch (err) {
      try {
        await restoreSnapshots(this.workspace, backup);
      } catch (restoreErr) {
        throw new WorkspaceTransactionError(
          `Transaction failed and restore was incomplete: ${
            restoreErr instanceof Error ? restoreErr.message : String(restoreErr)
          }; original: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      const message = err instanceof Error ? err.message : String(err);
      const txError = new WorkspaceTransactionError(
        `Transaction failed; previous state restored. ${message}`,
      );
      this.ops.length = 0;
      return { success: false, changeSet, error: txError.message };
    }

    this.ops.length = 0;
    await this.recordHistory(changeSet);
    return { success: true, changeSet };
  }

  async rollback(): Promise<void> {
    this.ops.length = 0;
  }
}

export function createTransaction(
  workspace: CourseWorkspace,
  options?: {
    description?: string;
    source?: WorkspaceChangeSet['source'];
    workspaceId?: string;
    recordHistory?: boolean;
  },
): WorkspaceTransaction {
  return new WorkspaceTransactionImpl(workspace, options);
}
