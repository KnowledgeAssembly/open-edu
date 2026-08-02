import { useTranslation } from '@open-edu/i18n';

export function CommunityPage(): JSX.Element {
  const { t } = useTranslation();
  return <h1>{t('website.pages.community')}</h1>;
}
