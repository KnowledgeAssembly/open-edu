export type WorkspaceKind = 'file' | 'directory';

export interface WorkspaceEntry {
  name: string;
  path: string;
  kind: WorkspaceKind;
}

export interface FileStat {
  path: string;
  kind: WorkspaceKind;
  size: number;
  modifiedAt: number;
  mimeType?: string;
}

export interface CourseWorkspace {
  list(path: string): Promise<WorkspaceEntry[]>;
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<Uint8Array>;
  readText(path: string): Promise<string>;
  write(path: string, data: Uint8Array): Promise<void>;
  writeText(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  stat(path: string): Promise<FileStat>;
}
