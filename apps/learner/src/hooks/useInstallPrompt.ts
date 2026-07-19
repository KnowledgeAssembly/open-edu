import { useState, useEffect, useCallback, useRef } from 'react';
import { getInstallState, promptInstall } from '@open-edu/pwa-core';

export function useInstallPrompt() {
  const [state, setState] = useState(() => getInstallState());
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const interval = setInterval(() => {
      setState(getInstallState());
    }, 2000);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, []);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (!cancelledRef.current) {
      setState(getInstallState());
    }
    return result;
  }, []);

  return { ...state, install };
}
