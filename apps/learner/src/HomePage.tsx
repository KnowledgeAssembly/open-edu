import type { PackageSummary } from '@open-edu/core';
import { type AppView } from './AppShell';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import { getAllBundleProgress } from './bundleProgressStorage';
import { Button } from '@open-edu/design-system';
import { BookOpen, TrendingUp, Trophy, Sparkles, PlayCircle } from 'lucide-react';

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
    <div className="p-xl max-w-4xl mx-auto" data-testid="home-page">
      <h1 className="text-h1 font-display text-on-surface font-bold mb-sm">Welcome to OpenEdu</h1>
      <p className="text-body-reading text-on-surface-variant mb-xl">
        Your interactive learning platform. Explore courses, track progress, and earn badges.
      </p>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-surface-variant mb-xl">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4 text-primary" />
          <strong className="text-on-surface font-semibold">{totalUnits}</strong> learning units
        </span>
        <span className="flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <strong className="text-on-surface font-semibold">{inProgressCount}</strong> in progress
        </span>
        <span className="flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-primary" />
          <strong className="text-on-surface font-semibold">{badgeCount}</strong> badges earned
        </span>
      </div>

      <div className="flex flex-col gap-md">
        <div className="p-md border border-outline-variant rounded-lg">
          <h2 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate({ view: 'catalog' })}>
              <PlayCircle className="h-4 w-4 mr-2" /> Browse Courses
            </Button>
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
