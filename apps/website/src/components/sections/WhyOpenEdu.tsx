import { useTranslation } from '@open-edu/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StaggerReveal,
} from '@open-edu/design-system';
import { Accessibility, Bot, Code2, Globe, Puzzle, WifiOff, type LucideIcon } from 'lucide-react';

interface Feature {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

const FEATURES: Feature[] = [
  {
    icon: Puzzle,
    titleKey: 'website.why.interactive.title',
    descriptionKey: 'website.why.interactive.description',
  },
  {
    icon: WifiOff,
    titleKey: 'website.why.offline.title',
    descriptionKey: 'website.why.offline.description',
  },
  {
    icon: Bot,
    titleKey: 'website.why.ai.title',
    descriptionKey: 'website.why.ai.description',
  },
  {
    icon: Code2,
    titleKey: 'website.why.open.title',
    descriptionKey: 'website.why.open.description',
  },
  {
    icon: Accessibility,
    titleKey: 'website.why.accessible.title',
    descriptionKey: 'website.why.accessible.description',
  },
  {
    icon: Globe,
    titleKey: 'website.why.global.title',
    descriptionKey: 'website.why.global.description',
  },
];

export function WhyOpenEdu(): JSX.Element {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="why-openedu-heading" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-semibold uppercase tracking-wide">
            {t('website.why.eyebrow')}
          </p>
          <h2
            id="why-openedu-heading"
            className="text-on-surface mt-4 text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {t('website.why.title')}
          </h2>
          <p className="text-on-surface-variant mt-4 text-lg">{t('website.why.subtitle')}</p>
        </div>

        <StaggerReveal delayMs={120} className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.titleKey} className="h-full">
                <CardHeader>
                  <div className="bg-primary/10 text-primary inline-flex h-12 w-12 items-center justify-center rounded-lg">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(feature.descriptionKey)}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}

WhyOpenEdu.displayName = 'WhyOpenEdu';
