import type { FileEntry, FileContent } from './types';

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

export async function listFiles(): Promise<FileEntry[]> {
  const data = await apiRequest<{ files: FileEntry[] }>('/tree');
  return data.files;
}

export async function readFile(path: string): Promise<FileContent> {
  return await apiRequest<FileContent>(`/file?path=${encodeURIComponent(path)}`);
}

export async function writeFile(
  path: string,
  content: string,
  validate = true,
): Promise<{ success: boolean; path: string }> {
  return await apiRequest<{ success: boolean; path: string }>('/file', {
    method: 'PUT',
    body: JSON.stringify({ path, content, validate }),
  });
}

export async function createFile(
  path: string,
  content?: string,
  validate = true,
): Promise<{ success: boolean; path: string }> {
  return await apiRequest<{ success: boolean; path: string }>('/file', {
    method: 'POST',
    body: JSON.stringify({ path, content, validate }),
  });
}

export async function deleteFile(path: string): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>(`/file?path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
  });
}

export async function uploadAsset(
  file: File,
  path?: string,
): Promise<{ success: boolean; path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (path) {
    formData.append('path', path);
  }

  const res = await fetch(`${API_BASE}/assets/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Upload failed');
  }

  return data;
}

export async function getPackageDir(): Promise<string> {
  const data = await apiRequest<{ packageDir: string }>('/dir');
  return data.packageDir;
}

export async function validatePackage(): Promise<{
  valid: boolean;
  errors: Array<{ path: string; error: string }>;
}> {
  return await apiRequest<{ valid: boolean; errors: Array<{ path: string; error: string }> }>(
    '/validate',
    { method: 'POST' },
  );
}
