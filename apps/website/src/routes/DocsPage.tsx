import { useTranslation } from '@open-edu/i18n';
import { Button } from '@open-edu/design-system';
import { GITHUB_URL } from '../config';

export function DocsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="text-on-surface text-3xl font-bold tracking-tight sm:text-4xl">
          {t('website.docs_page.title')}
        </h1>
        <p className="text-on-surface-variant mt-4 text-lg">{t('website.docs_page.subtitle')}</p>
      </div>

      <Button asChild className="mt-8">
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          {t('website.docs_page.cta')}
        </a>
      </Button>
    </section>
  );
}
