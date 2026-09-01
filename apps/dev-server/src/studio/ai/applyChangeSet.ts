import {
  createTransaction,
  type CourseWorkspace,
  type WorkspaceChangeSet,
} from '@open-edu/storage';
import type { CommitResult } from '@open-edu/storage';
import { assertSafeCoursePath } from '../courseFiles.js';

/**
 * Apply a ChangeSet atomically through a WorkspaceTransaction (SPEC Rule 6).
 * A multi-file AI change either commits all or none.
 */
export async function applyChangeSet(
  changeSet: WorkspaceChangeSet,
  workspace: CourseWorkspace,
): Promise<CommitResult> {
  const transaction = createTransaction(workspace, {
    description: changeSet.description,
    source: changeSet.source,
  });
  for (const change of changeSet.changes) {
    const path = assertSafeCoursePath(change.path);
    switch (change.operation) {
      case 'create':
      case 'update': {
        if (!change.newContent) {
          throw new Error(`Missing newContent for ${path}`);
        }
        transaction.write(path, new Uint8Array(change.newContent));
        break;
      }
      case 'delete':
        transaction.delete(path);
        break;
      case 'move': {
        if (!change.from || !change.to) {
          throw new Error(`Move change for ${path} is missing from/to paths`);
        }
        transaction.move(assertSafeCoursePath(change.from), assertSafeCoursePath(change.to));
        break;
      }
    }
  }
  return transaction.commit();
}
