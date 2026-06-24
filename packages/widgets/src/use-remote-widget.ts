import { useState, useEffect } from 'react';
import type { RemoteWidgetManifest, RemoteWidgetLoadResult } from './remote-loader';
import { RemoteWidgetLoader } from './remote-loader';
import type { WidgetRegistry, WidgetDefinition } from './types';

export interface UseRemoteWidgetResult {
  widget: WidgetDefinition | undefined;
  status: 'loading' | 'success' | 'error';
  error?: string;
}

export function useRemoteWidget(
  manifest: RemoteWidgetManifest,
  registry: WidgetRegistry | undefined,
): UseRemoteWidgetResult {
  const [result, setResult] = useState<UseRemoteWidgetResult>(() => {
    const loader = RemoteWidgetLoader.getInstance();
    const cached = loader.getCached(manifest);
    if (cached) {
      return { widget: cached, status: 'success' };
    }
    const reg = registry?.getRemoteRegistration(manifest);
    if (reg?.status === 'error') {
      return { widget: undefined, status: 'error', error: reg.error };
    }
    return { widget: undefined, status: 'loading' };
  });

  useEffect(() => {
    if (!registry) return;
    if (result.status === 'success') return;

    const loader = RemoteWidgetLoader.getInstance();

    const cached = loader.getCached(manifest);
    if (cached) {
      setResult({ widget: cached, status: 'success' });
      return;
    }

    let cancelled = false;

    const unsubscribe = loader.subscribe(manifest, (loadResult: RemoteWidgetLoadResult) => {
      if (cancelled) return;
      if (loadResult.status === 'success') {
        const def = loader.getCached(manifest);
        setResult({ widget: def, status: 'success' });
      } else if (loadResult.status === 'error') {
        setResult({ widget: undefined, status: 'error', error: loadResult.error });
      }
    });

    loader.load(manifest, registry).catch((err: Error) => {
      if (cancelled) return;
      setResult({
        widget: undefined,
        status: 'error',
        error: err.message,
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [manifest.id, manifest.version, manifest.url, registry]);

  return result;
}
