import { useTranslation } from '@open-edu/i18n';
import { Button, Card, CardContent } from '@open-edu/design-system';
import { ExternalLink, Star } from 'lucide-react';
import { GITHUB_URL } from '../../config';
import { StatCounter } from '../../ui/StatCounter';

function MascotSvg(): JSX.Element {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24 shrink-0" aria-hidden="true" focusable="false">
      <g fill="var(--oe-color-primary)">
        <path d="M60 12 L108 34 L60 56 L12 34 Z" />
        <rect x="14" y="38" width="92" height="6" rx="3" />
      </g>
      <path
        d="M60 56 L60 76"
        stroke="var(--oe-color-outline)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="60" cy="84" r="18" fill="var(--oe-color-surface-variant)" />
      <circle cx="60" cy="80" r="2.5" fill="var(--oe-color-on-surface-variant)" />
      <circle cx="52" cy="90" r="2.5" fill="var(--oe-color-on-surface-variant)" />
      <circle cx="68" cy="90" r="2.5" fill="var(--oe-color-on-surface-variant)" />
      <path d="M14 64 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="var(--oe-color-tertiary)" />
      <path
        d="M100 78 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5 Z"
        fill="var(--oe-color-secondary)"
      />
    </svg>
  );
}

export function OpenSourceCommunity(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="community-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.community.eyebrow')}
          </p>
          <h2
            id="community-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.community.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.community.subtitle')}</p>
        </div>

        <Card className="mt-12">
          <CardContent className="flex flex-col items-center gap-8 p-8 md:flex-row md:justify-between">
            <MascotSvg />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <Star className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('website.community.star_on_github')}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('website.community.contribute')}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 grid grid-cols-2 gap-6 md:grid-cols-4">
          <StatCounter
            value={120}
            label={t('website.community.stat_contributors')}
            format={(n) => `${n}+`}
          />
          <StatCounter
            value={85}
            label={t('website.community.stat_packages')}
            format={(n) => `${n}+`}
          />
          <StatCounter
            value={50}
            label={t('website.community.stat_courses')}
            format={(n) => `${n}+`}
          />
          <StatCounter
            value={15000}
            label={t('website.community.stat_stars')}
            format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k+` : String(n))}
          />
        </div>
      </div>
    </section>
  );
}

OpenSourceCommunity.displayName = 'OpenSourceCommunity';
