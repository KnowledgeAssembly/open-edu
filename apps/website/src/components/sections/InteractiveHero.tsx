import { Link } from 'react-router-dom';
import { useTranslation } from '@open-edu/i18n';
import { Badge, Button } from '@open-edu/design-system';
import { LEARNER_APP_URL } from '../../config';
import { PrismLessonCard } from '../../ui/PrismLessonCard';

function LandscapeSvg(): JSX.Element {
  return (
    <svg viewBox="0 0 640 220" className="mt-12 w-full" aria-hidden="true" focusable="false">
      <circle cx="520" cy="62" r="24" fill="var(--oe-color-tertiary)" />
      <circle cx="520" cy="62" r="40" fill="var(--oe-color-tertiary)" opacity="0.25" />
      <g fill="var(--oe-color-primary-container)">
        <rect x="96" y="126" width="24" height="66" />
        <rect x="128" y="110" width="20" height="82" />
        <rect x="156" y="134" width="28" height="58" />
        <rect x="248" y="118" width="20" height="74" />
        <rect x="276" y="130" width="26" height="62" />
        <rect x="424" y="114" width="22" height="78" />
        <rect x="454" y="138" width="24" height="54" />
      </g>
      <path
        d="M0 168 C 120 96, 260 120, 360 140 C 470 162, 540 120, 640 148 L 640 220 L 0 220 Z"
        fill="var(--oe-color-secondary-container)"
      />
      <path
        d="M0 190 C 180 152, 320 172, 420 182 C 520 192, 580 174, 640 186 L 640 220 L 0 220 Z"
        fill="var(--oe-color-surface-variant)"
      />
      <rect x="0" y="200" width="640" height="20" fill="var(--oe-color-surface-container-high)" />
    </svg>
  );
}

function CalloutArrowSvg(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8 -rotate-12" aria-hidden="true" focusable="false">
      <path
        d="M8 40 C 22 38, 32 30, 36 14"
        fill="none"
        stroke="var(--oe-color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M30 16 L 36 14 L 34 20"
        fill="none"
        stroke="var(--oe-color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InteractiveHero(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="hero-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-primary text-sm font-semibold uppercase tracking-wide">
              {t('website.hero.eyebrow')}
            </p>
            <h1
              id="hero-heading"
              className="text-on-surface mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              {t('website.hero.headline')}
            </h1>
            <p className="text-on-surface-variant mt-6 max-w-xl text-lg">
              {t('website.hero.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href={LEARNER_APP_URL}>{t('website.hero.start_learning')}</a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/courses">{t('website.hero.explore_courses')}</Link>
              </Button>
            </div>
            <LandscapeSvg />
          </div>

          <div>
            <div className="flex items-end gap-2">
              <Badge className="rounded-lg px-3 py-1.5 text-sm">
                {t('website.hero.try_it_now')}
              </Badge>
              <CalloutArrowSvg />
            </div>
            <div className="mt-4">
              <PrismLessonCard />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
