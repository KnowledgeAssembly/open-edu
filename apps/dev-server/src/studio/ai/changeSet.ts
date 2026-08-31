import type { CourseWorkspace, WorkspaceChange, WorkspaceChangeSet } from '@open-edu/storage';
import { isTextCourseFile } from '../courseFiles.js';

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  text: string;
}

export interface FileDiff {
  path: string;
  operation: WorkspaceChange['operation'];
  marker: 'added' | 'modified' | 'deleted';
  binary: boolean;
  header: string;
  lines?: DiffLine[];
}

const TEXT_DECODER = new TextDecoder();

function decodeText(bytes: Uint8Array | undefined): string {
  if (!bytes) return '';
  return TEXT_DECODER.decode(bytes);
}

function isBinary(bytes: Uint8Array | undefined): boolean {
  return bytes !== undefined && decodeText(bytes).includes('\uFFFD');
}

/** Minimal LCS line diff (SPEC §36 text files). */
export function diffText(previous: string, next: string): DiffLine[] {
  const a = previous.split('\n');
  const b = next.split('\n');
  const prevLines = a[a.length - 1] === '' ? a.slice(0, -1) : a;
  const nextLines = b[b.length - 1] === '' ? b.slice(0, -1) : b;

  const n = prevLines.length;
  const m = nextLines.length;
  const table: number[][] = Array.from({ length: n + 1 }, () =>
    Array.from({ length: m + 1 }, () => 0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i]![j] =
        prevLines[i] === nextLines[j]
          ? 1 + table[i + 1]![j + 1]!
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && prevLines[i] === nextLines[j]) {
      out.push({ type: 'context', text: prevLines[i]! });
      i += 1;
      j += 1;
    } else if (j < m && (i === n || table[i]![j + 1]! >= table[i + 1]![j]!)) {
      out.push({ type: 'added', text: nextLines[j]! });
      j += 1;
    } else if (i < n) {
      out.push({ type: 'removed', text: prevLines[i]! });
      i += 1;
    }
  }
  return out;
}

/**
 * Build a human-readable diff preview for a ChangeSet (SPEC §36). Binary files
 * are summarized with a metadata-level marker; text files get a line diff.
 */
export function diffChangeSet(
  changeSet: WorkspaceChangeSet,
  _workspace: CourseWorkspace,
): Promise<FileDiff[]> {
  const diffs: FileDiff[] = changeSet.changes.map((change) => {
    switch (change.operation) {
      case 'create': {
        const binary = isBinary(change.newContent);
        return {
          path: change.path,
          operation: 'create',
          marker: 'added',
          binary,
          header: `+ ${change.path}`,
          ...(binary ? {} : { lines: diffText('', decodeText(change.newContent)) }),
        };
      }
      case 'delete': {
        const binary = isBinary(change.previousContent);
        return {
          path: change.path,
          operation: 'delete',
          marker: 'deleted',
          binary,
          header: `- ${change.path}`,
          ...(binary ? {} : { lines: diffText(decodeText(change.previousContent), '') }),
        };
      }
      case 'move': {
        return {
          path: change.path,
          operation: 'move',
          marker: 'modified',
          binary: false,
          header: `~ ${change.from} → ${change.to}`,
        };
      }
      case 'update':
      default: {
        const previousText = decodeText(change.previousContent);
        const nextText = decodeText(change.newContent);
        const binary =
          isBinary(change.previousContent) ||
          isBinary(change.newContent) ||
          !isTextCourseFile(change.path);
        return {
          path: change.path,
          operation: 'update',
          marker: 'modified',
          binary,
          header: binary ? `~ ${change.path} — Binary file changed` : `~ ${change.path}`,
          ...(binary ? {} : { lines: diffText(previousText, nextText) }),
        };
      }
    }
  });
  return Promise.resolve(diffs);
}
