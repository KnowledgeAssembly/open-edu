import { useTranslation } from '@open-edu/i18n';
import { Card, CardContent, Skeleton } from '@open-edu/design-system';

export function CoursesPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="text-on-surface text-3xl font-bold tracking-tight sm:text-4xl">
          {t('website.courses_page.title')}
        </h1>
        <p className="text-on-surface-variant mt-4 text-lg">{t('website.courses_page.subtitle')}</p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-4 p-6">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
