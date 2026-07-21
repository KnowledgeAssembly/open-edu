import * as React from 'react';
import { HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.js';
import { Progress } from './ui/progress.js';
import { useTranslation } from '@open-edu/i18n';

interface StorageUsageCardProps {
  usage: number;
  quota: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const StorageUsageCard = React.forwardRef<HTMLDivElement, StorageUsageCardProps>(
  ({ usage, quota }, ref) => {
    const { t } = useTranslation();
    const percentage = quota > 0 ? Math.round((usage / quota) * 100) : 0;

    return (
      <Card ref={ref}>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <HardDrive className="h-5 w-5" aria-hidden="true" />
          <CardTitle className="text-body-ui">{t('learner.storage.usage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={percentage} className="mb-2" aria-label={`${percentage}% used`} />
          <p className="text-on-surface/60 text-body-ui">
            {formatBytes(usage)} of {formatBytes(quota)} used ({percentage}%)
          </p>
        </CardContent>
      </Card>
    );
  },
);
StorageUsageCard.displayName = 'StorageUsageCard';
