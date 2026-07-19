export interface StorageUsage {
  usage: number;
  quota: number;
  percentage: number;
}

export async function getStorageUsage(): Promise<StorageUsage> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage ?? 0;
  const quota = estimate.quota ?? 0;

  return {
    usage,
    quota,
    percentage: quota > 0 ? usage / quota : 0,
  };
}
