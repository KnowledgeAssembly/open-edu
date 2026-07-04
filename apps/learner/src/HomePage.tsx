import type { PackageSummary } from '@open-edu/core';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import { getAllBundleProgress } from './bundleProgressStorage';
import { BookOpen, TrendingUp, Trophy } from 'lucide-react';
import { Button, HeroSection, SectionDivider, StatsSummary } from '@open-edu/design-system';

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
      <HeroSection variant="editorial" showIllustration className="mb-xl">
        <h1 className="text-display-lg font-display text-on-surface">Welcome back, Learner</h1>
        <p className="text-body-reading text-on-surface-variant mt-md max-w-prose">
          Continue where you left off, or explore new courses in the catalog.
        </p>
      </HeroSection>

      <StatsSummary
        items={[
          { value: totalUnits, label: 'learning units', icon: <BookOpen className="h-4 w-4" /> },
          {
            value: inProgressCount,
            label: 'in progress',
            icon: <TrendingUp className="h-4 w-4" />,
          },
          { value: badgeCount, label: 'badges earned', icon: <Trophy className="h-4 w-4" /> },
        ]}
      />

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
