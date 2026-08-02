import { useTranslation } from '@open-edu/i18n';

export function WidgetsPage(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('website.pages.widgets')}</h1>;
}
