import type { AiEndpointErrorCode, AiGenerateResult } from './ai/types.js';
import type { LibraryEntry } from './library/types.js';
import type { ActivitySummary } from './types.js';

const API_BASE = '/api/package';
const AI_BASE = '/api/studio/ai';
const LIBRARY_BASE = '/api/studio/library';

export interface StudioApiError extends Error {
  code?: AiEndpointErrorCode;
}

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || `Request failed: ${res.status}`);
  }
  return data as T;
}

async function aiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${AI_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = (await res.json().catch(() => null)) as {
    error?: string;
    details?: string;
    code?: string;
  } | null;
  if (!res.ok) {
    const message = data?.error || data?.details || `Request failed: ${res.status}`;
    const error = new Error(message) as StudioApiError;
    error.code = data?.code as AiEndpointErrorCode | undefined;
    throw error;
  }
  return data as T;
}

async function libraryRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${LIBRARY_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.details || `Request failed: ${res.status}`);
  }
  return data as T;
}

export function createStudioApi() {
  return {
    getPackageDir: () => apiRequest<{ packageDir: string }>('/dir').then((d) => d.packageDir),
    validate: () =>
      apiRequest<{ valid: boolean; errors: Array<{ path: string; error: string }> }>('/validate', {
        method: 'POST',
      }),
    getOutline: () => apiRequest<{ activities: ActivitySummary[]; title: string }>('/outline'),
    saveOutlineOrder: (orderedPaths: string[]) =>
      apiRequest<{ success: boolean }>('/outline', {
        method: 'PUT',
        body: JSON.stringify({ orderedPaths }),
      }),
    applyTemplate: (templateId: string) =>
      apiRequest<{ success: boolean }>('/create-from-template', {
        method: 'POST',
        body: JSON.stringify({ templateId, force: true }),
      }),
    exportOep: async () => {
      const res = await fetch(`${API_BASE}/export-oep`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      return { blob, fileName: match?.[1] || 'course.oep' };
    },
    readFile: (path: string) =>
      apiRequest<{ path: string; content: string }>(`/file?path=${encodeURIComponent(path)}`),
    writeFile: (path: string, content: string) =>
      apiRequest<{ success: boolean }>('/file', {
        method: 'PUT',
        body: JSON.stringify({ path, content, validate: true }),
      }),
    getAiStatus: () => aiRequest<{ available: boolean; reason?: string }>('/status', {}),
    generateFromNotes: (notes: string, force?: boolean) =>
      aiRequest<AiGenerateResult>('/generate', {
        method: 'POST',
        body: JSON.stringify({ notes, force }),
      }),
    getLibrary: () => libraryRequest<{ workspace: string; entries: LibraryEntry[] }>(''),
    openLibraryCourse: (relativePath: string) =>
      libraryRequest<{ success: boolean; packageDir: string }>('/open', {
        method: 'POST',
        body: JSON.stringify({ relativePath }),
      }),
    duplicateCourse: (relativePath: string, newId: string, newTitle: string) =>
      libraryRequest<{ success: boolean; entry: LibraryEntry }>('/duplicate', {
        method: 'POST',
        body: JSON.stringify({ relativePath, newId, newTitle }),
      }),
    renameCourse: (relativePath: string, newTitle: string) =>
      libraryRequest<{ success: boolean; entry: LibraryEntry }>('/rename', {
        method: 'POST',
        body: JSON.stringify({ relativePath, newTitle }),
      }),
    archiveCourse: (relativePath: string) =>
      libraryRequest<{ success: boolean; archivedPath: string }>('/archive', {
        method: 'POST',
        body: JSON.stringify({ relativePath }),
      }),
    importCourseFolder: (sourcePath: string) =>
      libraryRequest<{ success: boolean; entry: LibraryEntry }>('/import', {
        method: 'POST',
        body: JSON.stringify({ sourcePath }),
      }),
    createUnit: (title: string, courseRelativePaths: string[]) =>
      libraryRequest<{ success: boolean; entry: LibraryEntry }>('/create-unit', {
        method: 'POST',
        body: JSON.stringify({ title, courseRelativePaths }),
      }),
    exportUnitOep: async (relativePath: string) => {
      const res = await fetch(`${LIBRARY_BASE}/export-unit-oep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relativePath }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      return { blob, fileName: match?.[1] || 'unit.oep' };
    },
  };
}

export type StudioApi = ReturnType<typeof createStudioApi>;
