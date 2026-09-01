import { createChangeSet, type WorkspaceChangeSet } from '@open-edu/storage';
import type { DraftItem } from '@open-edu/companion/types';

const TEXT_ENCODER = new TextEncoder();

/**
 * Build a `WorkspaceChangeSet` creating one node file per draft item so the
 * whole batch commits atomically through the workspace transaction (SPEC §17).
 * `_existingPaths` is a placeholder for future de-duplication against the
 * current outline. The outline append is a separate concern: it becomes a
 * second change (package.json / workflow.json update) once an outline ChangeSet
 * exists, rather than a follow-on `saveOutlineOrder`.
 */
export function buildItemChangeSet(
  drafts: DraftItem[],
  _existingPaths: string[],
  explicitPaths?: string[],
): WorkspaceChangeSet {
  const stamp = Date.now();
  const changes = drafts.map((item, i) => {
    const ext = item.kind === 'lesson' ? '.md' : '.json';
    const path = explicitPaths?.[i] ?? `nodes/${item.kind}-${stamp + i}${ext}`;
    return {
      path,
      operation: 'create' as const,
      newContent: TEXT_ENCODER.encode(item.content),
    };
  });

  return createChangeSet('ai', `Draft ${drafts.length} item(s)`, changes);
}
