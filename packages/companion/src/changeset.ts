export type {
  WorkspaceChangeSet as ChangeSet,
  WorkspaceChange as ChangeOperation,
} from '@open-edu/storage';

export interface Diagnostic {
  path: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

export type WorkspaceTarget =
  | { kind: 'course'; id: string }
  | { kind: 'lesson'; path: string }
  | { kind: 'activity'; path: string }
  | { kind: 'asset'; path: string };

export interface ChangePreview {
  changeSetId: string;
  files: Array<{
    path: string;
    operation: 'create' | 'update' | 'delete' | 'move';
    summary: string;
  }>;
  diagnostics: Diagnostic[];
}
