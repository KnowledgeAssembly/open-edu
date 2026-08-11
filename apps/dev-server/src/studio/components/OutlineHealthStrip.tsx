import { Badge, Button } from '@open-edu/design-system';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';

export function OutlineHealthStrip({
  count,
  ready,
  onShare,
}: {
  count: number;
  ready: boolean;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-outline-variant bg-surface flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex items-center gap-2">
        {ready ? (
          <CheckCircle2 className="text-success h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <X className="text-error h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <div>
          <p className="text-on-surface text-sm font-medium">
            {t('studio.outline.healthCount', { count: String(count) })}
          </p>
          <p className="text-on-surface-variant text-sm">
            {ready ? t('studio.outline.healthReady') : t('studio.outline.healthNotReady')}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="hidden sm:inline-flex">
        {ready ? t('studio.share.ready') : t('studio.share.notReady')}
      </Badge>
      <Button variant={ready ? 'default' : 'outline'} size="sm" onClick={onShare}>
        {t('studio.nav.share')}
      </Button>
    </div>
  );
}
