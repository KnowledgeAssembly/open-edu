import type { CourseSource, SourceKind } from './types.js';

export function fileSource(file: File): CourseSource {
  return {
    kind: 'file' as SourceKind,
    label: file.name,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        if (signal) {
          signal.addEventListener('abort', () => {
            reader.abort();
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(new Uint8Array(reader.result));
          } else {
            reject(new Error('Failed to read file as ArrayBuffer'));
          }
        };
        reader.onerror = () => reject(new Error('File read error'));
        reader.readAsArrayBuffer(file);
      });
    },
  };
}

export function urlSource(url: string, label?: string): CourseSource {
  return {
    kind: 'url' as SourceKind,
    label: label ?? url,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}

export interface CatalogSourceOptions {
  downloadUrl: string;
  label: string;
  expectedChecksum?: string;
}

export function catalogSource(options: CatalogSourceOptions): CourseSource {
  return {
    kind: 'catalog' as SourceKind,
    label: options.label,
    async getBytes(signal?: AbortSignal): Promise<Uint8Array> {
      const response = await fetch(options.downloadUrl, { signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    },
  };
}
