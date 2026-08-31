import type { CourseWorkspace } from '@open-edu/storage';
import { walkWorkspace } from '@open-edu/storage';
import { isTextCourseFile } from '../courseFiles.js';

export interface WorkspaceSearchResult {
  path: string;
  matchType: 'filename' | 'path' | 'heading' | 'fulltext';
  snippet?: string;
}

export interface WorkspaceSearch {
  search(query: string): Promise<WorkspaceSearchResult[]>;
}

const TEXT_DECODER = new TextDecoder();
const MAX_RESULTS = 100;

function matchQuery(line: string, tokens: string[]): boolean {
  const lower = line.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Live workspace search over filenames, paths, markdown headings, and full
 * text (SPEC §40). Reads only text files; large binary assets are never
 * loaded. The result is derived data — rebuildable from CourseWorkspace.
 */
export function createWorkspaceSearch(workspace: CourseWorkspace): WorkspaceSearch {
  return {
    async search(query: string): Promise<WorkspaceSearchResult[]> {
      const tokens = tokenize(query);
      if (tokens.length === 0) return [];
      const results: WorkspaceSearchResult[] = [];
      const push = (result: WorkspaceSearchResult): void => {
        if (results.length < MAX_RESULTS) results.push(result);
      };

      const files = await walkWorkspace(workspace);
      for (const file of files) {
        const name = file.path.split('/').pop() ?? file.path;
        const nameMatched = matchQuery(name, tokens);
        const pathMatched = matchQuery(file.path, tokens);
        if (nameMatched) {
          push({ path: file.path, matchType: 'filename', snippet: name });
        } else if (pathMatched) {
          push({ path: file.path, matchType: 'path', snippet: file.path });
        }
        if (!isTextCourseFile(file.path)) continue;

        let content: string;
        try {
          content = TEXT_DECODER.decode(file.data);
        } catch {
          continue;
        }
        if (content.includes('\uFFFD')) continue;

        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!matchQuery(trimmed, tokens)) continue;
          if (/^#{1,6}\s/.test(trimmed)) {
            push({ path: file.path, matchType: 'heading', snippet: trimmed });
          } else {
            push({ path: file.path, matchType: 'fulltext', snippet: trimmed.slice(0, 120) });
          }
        }
      }
      return results;
    },
  };
}
