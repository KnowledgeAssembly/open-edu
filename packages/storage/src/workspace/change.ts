export interface WorkspaceChange {
  path: string;
  operation: 'create' | 'update' | 'delete' | 'move';
  /** Content of the file before the change (update/delete/move sources). */
  previousContent?: Uint8Array;
  /** Content of the file after the change (create/update/move targets). */
  newContent?: Uint8Array;
  /** Move source path (move only). */
  from?: string;
  /** Move destination path (move only). */
  to?: string;
}

export interface WorkspaceChangeSet {
  id: string;
  description: string;
  source: 'user' | 'ai';
  createdAt: number;
  changes: WorkspaceChange[];
}

export function createChangeSet(
  source: WorkspaceChangeSet['source'],
  description: string,
  changes: WorkspaceChange[],
): WorkspaceChangeSet {
  return {
    id: `cs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    description,
    source,
    createdAt: Date.now(),
    changes,
  };
}
