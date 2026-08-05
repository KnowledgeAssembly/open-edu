export type LibraryKind = 'course' | 'unit';

export interface LibraryEntry {
  id: string;
  title: string;
  kind: LibraryKind;
  /** Path relative to the workspace root */
  relativePath: string;
  version: string;
  /** Directory mtime in ms */
  updatedAt: number;
  archived?: boolean;
}
