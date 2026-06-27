import type { PackageSummary } from '@open-edu/core';
import { type AppView } from './LeftNav';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import { getAllBundleProgress } from './bundleProgressStorage';

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
          <div className="text-3xl mb-sm">{'\uD83D\uDCDA'}</div>
          <div className="text-h2 font-display text-primary font-bold">{totalUnits}</div>
          <p className="text-on-surface-variant text-sm">Learning Units Available</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
          <div className="text-3xl mb-sm">{'\uD83D\uDCC8'}</div>
          <div className="text-h2 font-display text-primary font-bold">{inProgressCount}</div>
          <p className="text-on-surface-variant text-sm">In Progress</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
          <div className="text-3xl mb-sm">{'\uD83C\uDFC6'}</div>
          <div className="text-h2 font-display text-primary font-bold">{badgeCount}</div>
          <p className="text-on-surface-variant text-sm">Badges Earned</p>
        </div>
      </div>

      <div className="flex flex-col gap-md">
        <div className="bg-primary-container/20 border border-primary-container rounded-xl p-md">
          <h2 className="text-h2 font-title text-primary mb-sm">Quick Links</h2>
          <div className="flex flex-wrap gap-sm">
            <button
              onClick={() => onNavigate({ view: 'catalog' })}
              className="bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold"
            >
              Browse Courses
            </button>
            <button
              onClick={() => onNavigate({ view: 'progress' })}
              className="bg-surface-container-high text-on-surface border border-outline-variant px-lg py-sm rounded-lg font-semibold"
            >
              View Progress
            </button>
            <button
              onClick={() => onNavigate({ view: 'settings' })}
              className="bg-surface-container-high text-on-surface border border-outline-variant px-lg py-sm rounded-lg font-semibold"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
