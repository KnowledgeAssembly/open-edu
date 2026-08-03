import { Suspense } from 'react';
import { useTranslation } from '@open-edu/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@open-edu/design-system';
import { WIDGET_DEMOS } from '../../data/widgets';

export function TryWidgets(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="widgets-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.widgets.eyebrow')}
          </p>
          <h2
            id="widgets-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.widgets.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.widgets.subtitle')}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {WIDGET_DEMOS.map((demo) => {
            const Icon = demo.icon;
            return (
              <Card key={demo.id} className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <CardTitle className="text-lg">{t(demo.titleKey)}</CardTitle>
                  </div>
                  <CardDescription>{t(demo.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                    <demo.Demo />
                  </Suspense>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

TryWidgets.displayName = 'TryWidgets';
