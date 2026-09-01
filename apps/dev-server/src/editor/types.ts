export interface FileEntry {
  path: string;
  label: string;
  category: string;
  extension: string;
}

export interface ContextMenuTarget {
  x: number;
  y: number;
  file: FileEntry | null;
  section?: string;
}

export interface FileContent {
  path: string;
  content: string;
  isEditable: boolean;
  extension: string;
}

export interface EditorFile {
  path: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  validationError: string | null;
  widgetErrors?: Array<{ path: string; message: string; severity: string; code: string }>;
}

export type EditorMode = 'preview' | 'edit';
export type ViewMode = 'form' | 'raw';

export interface PackageFileApi {
  listFiles(): Promise<FileEntry[]>;
  getPackageDir(): Promise<string>;
  readFile(path: string): Promise<{ path: string; content: string }>;
  writeFile(path: string, content: string, validate?: boolean): Promise<{ success: boolean }>;
  deleteFile(path: string): Promise<{ success: boolean }>;
  renameFile(
    oldPath: string,
    newPath: string,
  ): Promise<{ success: boolean; oldPath: string; newPath: string }>;
  createFile(path: string, content?: string): Promise<{ success: boolean; path: string }>;
  uploadAsset(file: File, path?: string): Promise<{ success: boolean; path: string }>;
}

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}
