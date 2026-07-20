import { useState, useEffect, useCallback } from 'react';
import { registerUpdateListener, skipWaiting, type UpdateState } from '@open-edu/pwa-core';

export function useUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cleanupFn: (() => void) | null = null;

    registerUpdateListener((state: UpdateState) => {
      if (!cancelled) {
        setUpdateAvailable(state.updateAvailable);
      }
    }).then((cleanup: () => void) => {
      if (cancelled) cleanup();
      else cleanupFn = cleanup;
    });

    return () => {
      cancelled = true;
      cleanupFn?.();
    };
  }, []);

  const dismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  const accept = useCallback(() => {
    skipWaiting().then(() => {
      window.location.reload();
    });
  }, []);

  return { updateAvailable, dismiss, accept };
}
