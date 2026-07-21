import { useState, useEffect } from 'react';
import type { PackageSummary } from '@open-edu/core';
import { useTranslation } from '@open-edu/i18n';
import { type AppView } from './AppShell';
import { getAllProgress, type ProgressData } from './progressStorage';
import { getAllBadges, type BadgesData } from './badgesStorage';
import { getAllBundleProgress, type BundleProgressData } from './bundleProgressStorage';
import { OpenModule } from '@open-edu/design-system';
import {
  Button,
  HeroSection,
  StatsSummary,
  SilhouetteGroup,
  AssemblyFlow,
  Pipili,
} from '@open-edu/design-system';

export interface HomePageProps {
  onNavigate: (view: AppView) => void;
  catalogPackages?: PackageSummary[];
  bundleEntries?: Record<string, unknown>;
}

export function HomePage({
  onNavigate,
  catalogPackages = [],
  bundleEntries,
}: HomePageProps): JSX.Element {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ProgressData>({});
  const [badgeData, setBadgeData] = useState<BadgesData>({});
  const [bundleProg, setBundleProg] = useState<BundleProgressData>({});
  useEffect(() => {
    getAllProgress().then(setProgress);
    getAllBadges().then(setBadgeData);
    getAllBundleProgress().then(setBundleProg);
  }, []);
  const courseCount = catalogPackages.length;
  const bundleCount = bundleEntries ? Object.keys(bundleEntries).length : 0;
  const totalUnits = courseCount + bundleCount;
  const inProgressCount =
    Object.values(progress).filter((p) => !p.isCompleted && p.visitedNodes.length > 0).length +
    Object.values(bundleProg).filter(
      (b) => !Object.values(b.moduleStatuses).every((s) => s === 'completed'),
    ).length;
  const badgeCount = Object.values(badgeData).reduce((sum, badges) => sum + badges.length, 0);

  return (
    <div className="p-xl mx-auto w-full max-w-6xl" data-testid="home-page">
      <HeroSection variant="editorial" showIllustration className="mb-xl">
        <h1 className="text-display-lg font-display text-on-surface">
          {t('learner.home.welcome_back')}
        </h1>
        <p className="text-body-reading text-on-surface-variant mt-md max-w-prose">
          {t('learner.home.subtitle')}
        </p>
        <div className="mt-md gap-md flex items-center">
          <Button onClick={() => onNavigate({ view: 'catalog' })}>
            {t('learner.home.begin_learning')}
          </Button>
          <Pipili size="sm" mood="idle" animated />
        </div>
      </HeroSection>

      <div
        className="pb-md text-caption text-on-surface-variant -mt-md text-center opacity-50"
        aria-hidden="true"
      >
        {t('learner.home.assembled_tagline')}
      </div>

      <div className="relative">
        <div
          className="-top-md absolute left-0 right-0 overflow-hidden opacity-[0.08]"
          aria-hidden="true"
        >
          <AssemblyFlow density="medium" className="h-md w-full" />
        </div>

        <StatsSummary
          animated
          items={[
            {
              value: totalUnits,
              label: t('learner.home.stat_courses'),
              icon: <OpenModule size="xs" satellites={3} />,
            },
            {
              value: inProgressCount,
              label: t('learner.home.stat_in_progress'),
              icon: <OpenModule size="xs" satellites={3} />,
            },
            {
              value: badgeCount,
              label: t('learner.home.stat_badges'),
              icon: <OpenModule size="xs" satellites={3} />,
            },
          ]}
        />
      </div>

      <div className="py-md gap-md relative flex items-center justify-center" aria-hidden="true">
        <div className="bg-outline-variant h-px flex-1 opacity-30" />
        <SilhouetteGroup
          figures={[
            { proportion: 'tall', palette: 1 },
            { proportion: 'wide', palette: 3 },
            { proportion: 'narrow', palette: 4 },
          ]}
        />
        <div className="bg-outline-variant h-px flex-1 opacity-30" />
      </div>

      <div className="p-md border-primary/10 relative rounded-xl border-2">
        <div
          className="absolute inset-0 overflow-hidden rounded-xl opacity-[0.04]"
          aria-hidden="true"
        >
          <AssemblyFlow density="dense" className="h-full w-full" />
        </div>
        <div className="relative z-10">
          <p className="text-body-reading text-on-surface-variant mb-md">
            {t('learner.home.cta_prompt')}
          </p>
          <div className="gap-sm flex flex-wrap">
            <Button onClick={() => onNavigate({ view: 'catalog' })}>
              {t('learner.home.browse_courses')}
            </Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'progress' })}>
              {t('learner.home.view_progress')}
            </Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'settings' })}>
              {t('learner.home.settings')}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden opacity-[0.06]" aria-hidden="true">
        <AssemblyFlow density="dense" animated className="h-lg w-full" />
      </div>
    </div>
  );
}
