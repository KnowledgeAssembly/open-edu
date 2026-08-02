import { useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { Badge, Card, CardContent, CardHeader, Switch, cn } from '@open-edu/design-system';
import { Atom, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

const TOGGLE_ID = 'offline-demo-toggle';
const STATUS_ID = 'offline-demo-status';

export function OfflineDemo(): JSX.Element {
  const { t } = useTranslation();
  const [isOffline, setIsOffline] = useState(false);

  return (
    <section aria-labelledby="offline-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.offline.eyebrow')}
          </p>
          <h2
            id="offline-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.offline.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.offline.subtitle')}</p>
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id={TOGGLE_ID}
                    checked={isOffline}
                    onCheckedChange={setIsOffline}
                    aria-describedby={STATUS_ID}
                  />
                  <label htmlFor={TOGGLE_ID} className="text-on-surface text-sm font-medium">
                    {t('website.offline.toggle_label')}
                  </label>
                </div>

                <div
                  id={STATUS_ID}
                  role="status"
                  aria-live="polite"
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
                    isOffline
                      ? 'bg-error-container text-on-error-container'
                      : 'bg-surface-variant text-on-surface-variant',
                  )}
                >
                  {isOffline ? (
                    <WifiOff className="text-error h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Wifi className="text-primary h-4 w-4" aria-hidden="true" />
                  )}
                  <Badge variant={isOffline ? 'destructive' : 'default'}>
                    {t(
                      isOffline ? 'website.offline.offline_badge' : 'website.offline.online_badge',
                    )}
                  </Badge>
                  <span>
                    {t(
                      isOffline
                        ? 'website.offline.status_offline'
                        : 'website.offline.status_online',
                    )}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="bg-surface-variant flex items-center gap-4 rounded-lg p-4">
                <div className="bg-primary/10 text-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <Atom className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-on-surface text-sm font-semibold">
                    {t('website.offline.course_title')}
                  </p>
                  <p className="text-on-surface-variant text-sm">
                    {t('website.offline.course_desc')}
                  </p>
                </div>
                {isOffline && (
                  <Badge variant="default" className="shrink-0">
                    <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {t('website.offline.available')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

OfflineDemo.displayName = 'OfflineDemo';
