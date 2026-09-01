import { getHistoryEntry, type HistoryEntry } from '../history-store.js';
import type { CourseWorkspace } from './types.js';

export interface UndoRedoResult {
  success: boolean;
  error?: string;
  /** Number of records that still reference the undo point (for tests). */
  historyId?: string;
}

function bytesOf(data: Uint8Array | ArrayBuffer | undefined): Uint8Array | undefined {
  if (data === undefined) return undefined;
  return new Uint8Array(data as ArrayBuffer);
}

/**
 * Undo a previously committed ChangeSet by restoring previous-content
 * snapshots (SPEC §38). Snapshot-based, not full Git semantics.
 */
export async function undo(workspace: CourseWorkspace, historyId: string): Promise<UndoRedoResult> {
  const entry = await getHistoryEntry(historyId);
  if (!entry) return { success: false, error: 'History entry not found' };

  for (const change of [...entry.changes].reverse()) {
    switch (change.operation) {
      case 'create':
        if (await workspace.exists(change.path)) {
          await workspace.delete(change.path);
        }
        break;
      case 'update':
        await restoreByteSnapshot(workspace, change.path, bytesOf(change.previousContent));
        break;
      case 'delete': {
        const content = bytesOf(change.previousContent);
        if (content) await workspace.write(change.path, content);
        break;
      }
      case 'move': {
        if (change.from && change.to) {
          try {
            if (await workspace.exists(change.to)) {
              await workspace.move(change.to, change.from);
            } else if (change.previousContent) {
              await workspace.write(change.from, bytesOf(change.previousContent)!);
            }
          } catch {
            const content = bytesOf(change.previousContent);
            if (content) {
              await workspace.write(change.from, content);
            }
          }
        }
        break;
      }
    }
  }
  return { success: true, historyId };
}

/**
 * Redo a previously committed ChangeSet by reapplying new-content snapshots.
 */
export async function redo(workspace: CourseWorkspace, historyId: string): Promise<UndoRedoResult> {
  const entry = await getHistoryEntry(historyId);
  if (!entry) return { success: false, error: 'History entry not found' };

  for (const change of entry.changes) {
    switch (change.operation) {
      case 'create':
      case 'update': {
        const content = bytesOf(change.newContent);
        if (content) await workspace.write(change.path, content);
        break;
      }
      case 'delete':
        if (await workspace.exists(change.path)) {
          await workspace.delete(change.path);
        }
        break;
      case 'move': {
        if (change.from && change.to) {
          if (await workspace.exists(change.from)) {
            try {
              await workspace.move(change.from, change.to);
            } catch {
              // destination may already exist after manual edits
            }
          }
        }
        break;
      }
    }
  }
  return { success: true, historyId };
}

async function restoreByteSnapshot(
  workspace: CourseWorkspace,
  path: string,
  content: Uint8Array | undefined,
): Promise<void> {
  if (content) {
    if (await workspace.exists(path)) {
      await workspace.delete(path).catch(() => {});
    }
    await workspace.write(path, content);
  } else if (await workspace.exists(path)) {
    await workspace.delete(path);
  }
}

export type { HistoryEntry };
