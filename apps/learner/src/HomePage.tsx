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
  const { t } = useTranslation('learner');
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
    <div className="p-xl mx-auto max-w-4xl" data-testid="home-page">
      <HeroSection variant="editorial" showIllustration className="mb-xl">
        <h1 className="text-display-lg font-display text-on-surface">{t('learner.home.welcome_back')}</h1>
        <p className="text-body-reading text-on-surface-variant mt-md max-w-prose">
          Continue where you left off, or explore new courses in the catalog.
        </p>
        <div className="mt-md flex items-center gap-4">
          <Button onClick={() => onNavigate({ view: 'catalog' })}>{t('learner.home.begin_learning')}</Button>
          <Pipili size="sm" mood="idle" animated />
        </div>
      </HeroSection>

      <div
        className="pb-md text-caption text-on-surface-variant -mt-6 text-center opacity-50"
        aria-hidden="true"
      >
        — assembled from parts —
      </div>

      <div className="relative">
        <div
          className="absolute -top-6 left-0 right-0 overflow-hidden opacity-[0.08]"
          aria-hidden="true"
        >
          <AssemblyFlow density="medium" className="h-5 w-full" />
        </div>

        <StatsSummary
          animated
          items={[
            { value: totalUnits, label: 'courses', icon: <OpenModule size="xs" satellites={3} /> },
            {
              value: inProgressCount,
              label: 'in progress',
              icon: <OpenModule size="xs" satellites={3} />,
            },
            { value: badgeCount, label: 'badges', icon: <OpenModule size="xs" satellites={3} /> },
          ]}
        />
      </div>

      <div className="py-md relative flex items-center justify-center gap-4" aria-hidden="true">
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

      <div
        className="p-md relative rounded-xl"
        style={{ border: '2px solid color-mix(in srgb, var(--oe-color-primary) 12%, transparent)' }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-xl opacity-[0.04]"
          aria-hidden="true"
        >
          <AssemblyFlow density="dense" className="h-full w-full" />
        </div>
        <div className="relative z-10">
          <p className="text-body-reading text-on-surface-variant mb-md">
            Ready to continue your learning journey?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate({ view: 'catalog' })}>{t('learner.home.browse_courses')}</Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'progress' })}>
              View Progress
            </Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'settings' })}>
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden opacity-[0.06]" aria-hidden="true">
        <AssemblyFlow density="dense" animated className="h-8 w-full" />
      </div>
    </div>
  );
}
