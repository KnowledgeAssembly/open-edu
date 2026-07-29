export interface FileEntry {
  path: string;
  label: string;
  category: string;
  extension: string;
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

export interface ValidationResult {
  valid: boolean;
  error: string | null;
}
