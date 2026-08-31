import {
  createTransaction,
  type CourseWorkspace,
  type WorkspaceChangeSet,
  type WorkspaceEntry,
  type WorkspaceTransaction,
} from '@open-edu/storage';
import { assertSafeCoursePath } from '../courseFiles.js';

export interface SearchResult {
  path: string;
  matchType: 'filename' | 'path' | 'heading' | 'fulltext';
  snippet?: string;
}

export interface WorkspaceSearchLike {
  search(query: string): Promise<SearchResult[]>;
}

export interface WorkspaceToolsContext {
  workspace: CourseWorkspace;
  search?: WorkspaceSearchLike;
}

export interface WorkspaceTools {
  list(path: string): Promise<WorkspaceEntry[]>;
  read(path: string): Promise<{ path: string; content: string }>;
  search(query: string): Promise<SearchResult[]>;
  create(path: string, content: string): Promise<{ ok: true; path: string }>;
  update(path: string, content: string): Promise<{ ok: true; path: string }>;
  delete(path: string): Promise<{ ok: true; path: string }>;
  move(from: string, to: string): Promise<{ ok: true; path: string }>;
  preview(): Promise<WorkspaceChangeSet | null>;
  discard(): Promise<void>;
  apply(): Promise<{ ok: boolean; changeSet?: WorkspaceChangeSet; error?: string }>;
}

const TEXT_ENCODER = new TextEncoder();

async function filenameAndPathSearch(
  workspace: CourseWorkspace,
  query: string,
): Promise<SearchResult[]> {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];
  async function visit(dir: string): Promise<void> {
    const entries = await workspace.list(dir);
    for (const entry of entries) {
      if (entry.kind === 'directory') {
        await visit(entry.path);
      } else if (entry.name.toLowerCase().includes(q) || entry.path.toLowerCase().includes(q)) {
        results.push({ path: entry.path, matchType: 'path', snippet: entry.name });
      }
    }
  }
  await visit('');
  return results;
}

/**
 * Controlled workspace tools for the AI Companion (SPEC §32, §34). All writes
 * are staged through a single `WorkspaceTransaction` so nothing touches the
 * canonical workspace until the ChangeSet is approved and applied atomically.
 */
export function createWorkspaceTools(context: WorkspaceToolsContext): WorkspaceTools {
  const transaction: WorkspaceTransaction = createTransaction(context.workspace, {
    description: 'AI workspace change',
    source: 'ai',
  });

  return {
    async list(path) {
      return context.workspace.list(path);
    },

    async read(path) {
      const content = await context.workspace.readText(path);
      return { path, content };
    },

    async search(query) {
      if (context.search) {
        return context.search.search(query);
      }
      return filenameAndPathSearch(context.workspace, query);
    },

    async create(path, content) {
      transaction.write(assertSafeCoursePath(path), TEXT_ENCODER.encode(content));
      return { ok: true, path: assertSafeCoursePath(path) };
    },

    async update(path, content) {
      return this.create(path, content);
    },

    async delete(path) {
      transaction.delete(assertSafeCoursePath(path));
      return { ok: true, path: assertSafeCoursePath(path) };
    },

    async move(from, to) {
      transaction.move(assertSafeCoursePath(from), assertSafeCoursePath(to));
      return { ok: true, path: assertSafeCoursePath(to) };
    },

    async preview() {
      try {
        return await transaction.preview();
      } catch {
        return null;
      }
    },

    async discard() {
      await transaction.rollback();
    },

    async apply() {
      const result = await transaction.commit();
      if (!result.success) {
        return { ok: false, error: result.error };
      }
      return { ok: true, changeSet: result.changeSet };
    },
  };
}
