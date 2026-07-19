import { useState, useEffect } from 'react';

interface StorageUsage {
  usage: number;
  quota: number;
  percentage: number;
}

export function useStorageUsage(): StorageUsage {
  const [usage, setUsage] = useState<StorageUsage>({ usage: 0, quota: 0, percentage: 0 });

  useEffect(() => {
    async function fetchUsage() {
      if (!navigator.storage?.estimate) return;
      const estimate = await navigator.storage.estimate();
      const u = estimate.usage ?? 0;
      const q = estimate.quota ?? 0;
      setUsage({ usage: u, quota: q, percentage: q > 0 ? u / q : 0 });
    }
    fetchUsage();
  }, []);

  return usage;
}
