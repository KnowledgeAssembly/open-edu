import type { PackageSummary } from '@open-edu/core';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import { getAllBundleProgress } from './bundleProgressStorage';
import { Button, HeroSection, SectionDivider } from '@open-edu/design-system';

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
  const progress = getAllProgress();
  const badgeData = getAllBadges();
  const bundleProg = getAllBundleProgress();
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
      <HeroSection className="mb-xl">
        <h1 className="text-h1 font-display text-on-surface mb-sm font-bold">
          Welcome back, Learner
        </h1>
        <p className="text-body-reading text-on-surface-variant">
          Continue where you left off, or explore new courses in the catalog.
        </p>
      </HeroSection>

      <div className="mb-xl flex items-center gap-8">
        <div className="text-on-surface flex items-center gap-2 text-sm">
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-primary fill-current">
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span>
            <strong>{totalUnits}</strong> courses
          </span>
        </div>
        <div className="text-on-surface flex items-center gap-2 text-sm">
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-primary fill-current">
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span>
            <strong>{inProgressCount}</strong> in progress
          </span>
        </div>
        <div className="text-on-surface flex items-center gap-2 text-sm">
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-primary fill-current">
            <circle cx="10" cy="10" r="8" />
          </svg>
          <span>
            <strong>{badgeCount}</strong> badges
          </span>
        </div>
      </div>

      <SectionDivider density="minimal" className="mb-xl" />

      <div className="gap-md flex flex-col">
        <div className="p-md border-outline-variant rounded-lg border">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate({ view: 'catalog' })}>Browse Courses</Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'progress' })}>
              View Progress
            </Button>
            <Button variant="outline" onClick={() => onNavigate({ view: 'settings' })}>
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
