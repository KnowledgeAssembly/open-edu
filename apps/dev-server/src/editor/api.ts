import type { FileEntry, FileContent } from './types';

const API_BASE = '/api';

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
  const data = await apiRequest<{ files: FileEntry[] }>('/files');
  return data.files;
}

export async function readFile(path: string): Promise<FileContent> {
  return await apiRequest<FileContent>(`/files?path=${encodeURIComponent(path)}`);
}

export async function writeFile(
  path: string,
  content: string,
  validate = true,
): Promise<{ success: boolean; path: string }> {
  return await apiRequest<{ success: boolean; path: string }>('/files', {
    method: 'POST',
    body: JSON.stringify({ path, content, validate }),
  });
}

export async function deleteFile(path: string): Promise<{ success: boolean }> {
  return await apiRequest<{ success: boolean }>(`/files?path=${encodeURIComponent(path)}`, {
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
  const data = await apiRequest<{ packageDir: string }>('/package/dir');
  return data.packageDir;
}
