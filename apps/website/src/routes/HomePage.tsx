import { useTranslation } from '@open-edu/i18n';

export function HomePage(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('website.pages.home')}</h1>;
}
