import { useStorageUsage } from '../hooks/useStorageUsage.js';
import { StorageUsageCard } from '../components/StorageUsageCard.js';

export function StorageSettingsPage() {
  const { usage, quota } = useStorageUsage();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Storage Settings</h1>
      <StorageUsageCard usage={usage} quota={quota} />
    </div>
  );
}
