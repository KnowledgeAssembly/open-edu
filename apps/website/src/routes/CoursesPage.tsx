import { useTranslation } from '@open-edu/i18n';

export function CoursesPage(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('website.pages.courses')}</h1>;
}
