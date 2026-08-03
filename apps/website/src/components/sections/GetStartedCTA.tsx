import { useTranslation } from '@open-edu/i18n';
import { Button, Card, CardContent } from '@open-edu/design-system';
import { LEARNER_APP_URL } from '../../config';

export function GetStartedCTA(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="cta-heading">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Card className="from-primary/10 via-surface-variant to-surface bg-gradient-to-br">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center sm:p-14">
            <h2
              id="cta-heading"
              className="text-on-surface text-3xl font-bold tracking-tight sm:text-4xl"
            >
              {t('website.cta.heading')}
            </h2>
            <p className="text-on-surface-variant max-w-xl text-lg">{t('website.cta.subtitle')}</p>
            <Button asChild size="lg" className="mt-2">
              <a href={LEARNER_APP_URL}>{t('website.cta.button')}</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

GetStartedCTA.displayName = 'GetStartedCTA';
