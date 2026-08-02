import { useTranslation } from '@open-edu/i18n';

export function DocsPage(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('website.pages.docs')}</h1>;
}
