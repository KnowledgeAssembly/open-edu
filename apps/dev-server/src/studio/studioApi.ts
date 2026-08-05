import type { ActivitySummary } from './types.js';

const API_BASE = '/api/package';

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
  };
}

export type StudioApi = ReturnType<typeof createStudioApi>;
