import type { WidgetDefinition, WidgetRegistry, RemoteWidgetManifest } from './types';

export type { RemoteWidgetManifest } from './types';

export interface RemoteWidgetLoadResult {
  status: 'loading' | 'success' | 'error';
  error?: string;
}

type LoadCallback = (result: RemoteWidgetLoadResult) => void;

export type EvaluateModule = (code: string) => Promise<{ default?: unknown }>;

async function digestMessage(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class RemoteWidgetLoader {
  private static instance: RemoteWidgetLoader;
  private cache = new Map<string, WidgetDefinition>();
  private pendingLoads = new Map<string, Promise<WidgetDefinition>>();
  private listeners = new Map<string, Set<LoadCallback>>();

  static getInstance(): RemoteWidgetLoader {
    if (!RemoteWidgetLoader.instance) {
      RemoteWidgetLoader.instance = new RemoteWidgetLoader();
    }
    return RemoteWidgetLoader.instance;
  }

  async load(
    manifest: RemoteWidgetManifest,
    registry: WidgetRegistry,
    evaluate?: EvaluateModule,
  ): Promise<WidgetDefinition> {
    const cacheKey = `${manifest.id}@${manifest.version}`;

    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const pending = this.pendingLoads.get(cacheKey);
    if (pending) return pending;

    const loadPromise = this.fetchAndRegister(manifest, registry, cacheKey, evaluate);
    this.pendingLoads.set(cacheKey, loadPromise);

    try {
      const def = await loadPromise;
      return def;
    } finally {
      this.pendingLoads.delete(cacheKey);
    }
  }

  private async fetchAndRegister(
    manifest: RemoteWidgetManifest,
    registry: WidgetRegistry,
    cacheKey: string,
    evaluate?: EvaluateModule,
  ): Promise<WidgetDefinition> {
    const url = manifest.url;

    if (url.startsWith('file://')) {
      throw new Error(`Cannot load remote widget from file:// URL: ${url}`);
    }

    registry.updateRemoteStatus(manifest, 'loading');

    const response = await fetch(url);
    if (!response.ok) {
      const msg = `Failed to fetch remote widget: ${response.status} ${response.statusText}`;
      registry.updateRemoteStatus(manifest, 'error', msg);
      throw new Error(msg);
    }

    const code = await response.text();

    if (manifest.integrity) {
      const expectedHash = manifest.integrity.replace('sha256-', '').replace('sha-256-', '').trim();
      const actualHash = await digestMessage(code);
      if (actualHash !== expectedHash) {
        const msg = `Integrity check failed for widget "${manifest.id}": expected ${expectedHash}, got ${actualHash}`;
        registry.updateRemoteStatus(manifest, 'error', msg);
        throw new Error(msg);
      }
    }

    let mod: { default?: unknown };
    if (evaluate) {
      mod = await evaluate(code);
    } else {
      mod = await this.evaluateModule(code);
    }

    if (!mod.default || typeof mod.default !== 'object') {
      const msg = `Remote widget "${manifest.id}" has no default export or default export is not an object`;
      registry.updateRemoteStatus(manifest, 'error', msg);
      throw new Error(msg);
    }

    const def = mod.default as WidgetDefinition;
    if (!def.id || typeof def.render !== 'function') {
      const msg = `Remote widget "${manifest.id}" default export is not a valid WidgetDefinition`;
      registry.updateRemoteStatus(manifest, 'error', msg);
      throw new Error(msg);
    }

    registry.register(def);
    this.cache.set(cacheKey, def);
    registry.updateRemoteStatus(manifest, 'success');
    this.notifyListeners(cacheKey, { status: 'success' });

    return def;
  }

  private async evaluateModule(code: string): Promise<{ default?: unknown }> {
    const blob = new Blob([code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);

    try {
      return await import(/* @vite-ignore */ blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  subscribe(manifest: RemoteWidgetManifest, callback: LoadCallback): () => void {
    const key = `${manifest.id}@${manifest.version}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    const cached = this.cache.get(key);
    if (cached) {
      queueMicrotask(() => callback({ status: 'success' }));
    }

    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }

  private notifyListeners(key: string, result: RemoteWidgetLoadResult) {
    this.listeners.get(key)?.forEach((cb) => cb(result));
  }

  getCached(manifest: RemoteWidgetManifest): WidgetDefinition | undefined {
    return this.cache.get(`${manifest.id}@${manifest.version}`);
  }

  clearCache() {
    this.cache.clear();
  }
}
