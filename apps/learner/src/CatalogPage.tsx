import { useMemo, useState } from 'react';
import type { PackageSummary } from '@open-edu/core';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import type { AppView } from './LeftNav';

export interface CatalogPageProps {
  packages: PackageSummary[];
  onStartCourse: (packageDir: string) => void;
  onNavigate?: (view: AppView) => void;
}

export function CatalogPage({
  packages,
  onStartCourse,
  onNavigate,
}: CatalogPageProps): JSX.Element {
  const progress = getAllProgress();
  const badgeData = getAllBadges();

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pkgId of Object.keys(progress)) {
      counts[pkgId] = (badgeData[pkgId] ?? []).length;
    }
    return counts;
  }, [progress, badgeData]);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    packages.forEach((p) => (p.manifest.tags ?? []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [packages]);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'inProgress' | 'alphabetical'>('newest');

  const filtered = useMemo(() => {
    return activeTag
      ? packages.filter((p) => (p.manifest.tags ?? []).includes(activeTag!))
      : packages;
  }, [packages, activeTag]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case 'alphabetical':
        return list.sort((a, b) => a.manifest.title.localeCompare(b.manifest.title));
      case 'inProgress':
        return list.sort((a, b) => {
          const aProg = progress[a.manifest.id];
          const bProg = progress[b.manifest.id];
          if (aProg && !bProg) return -1;
          if (!aProg && bProg) return 1;
          return 0;
        });
      default:
        return list;
    }
  }, [filtered, sortBy, progress]);

  const inProgressCourses = useMemo(
    () =>
      packages.filter((p) => {
        const snap = progress[p.manifest.id];
        return snap && !snap.isCompleted;
      }),
    [packages, progress],
  );

  const continueList = useMemo(() => inProgressCourses.slice(0, 4), [inProgressCourses]);

  if (packages.length === 0) {
    return (
      <div className="p-xl">
        <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">Courses</h1>
        <p className="text-on-surface-variant">No courses found.</p>
      </div>
    );
  }

  return (
    <div className="p-xl max-w-7xl mx-auto" data-testid="catalog-page">
      <h1 className="text-h1 font-display text-on-surface font-bold mb-lg">Course Catalog</h1>

      {continueList.length > 0 && (
        <section className="mb-xl" data-testid="continue-learning-shelf">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-h2 font-display font-bold text-on-surface">Continue Learning</h2>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate({ view: 'progress' })}
                className="text-sm text-primary bg-transparent border-none cursor-pointer font-semibold"
              >
                View all
              </button>
            )}
          </div>
          <div className="flex gap-md overflow-x-auto pb-sm">
            {continueList.map((pkg) => (
              <div key={pkg.manifest.id} className="min-w-[260px] max-w-[300px] flex-shrink-0">
                <CourseCard
                  manifest={pkg.manifest}
                  nodeCount={pkg.nodeCount}
                  badgeCount={pkg.availableBadges}
                  earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
                  progress={progress[pkg.manifest.id] ?? null}
                  onStart={() => onStartCourse(pkg.rootDir)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-sm mb-md" data-testid="filter-chips">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`px-md py-sm rounded-full text-sm font-semibold border-none cursor-pointer transition-colors ${
              activeTag === null
                ? 'bg-primary text-on-primary'
                : 'bg-surface-variant text-on-surface-variant'
            }`}
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`px-md py-sm rounded-full text-sm font-semibold border-none cursor-pointer transition-colors ${
                activeTag === tag
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-variant text-on-surface-variant'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-md mb-md" data-testid="sort-controls">
        <span className="text-sm text-on-surface-variant font-semibold">Sort:</span>
        {(
          [
            ['newest', 'Newest'],
            ['inProgress', 'In Progress First'],
            ['alphabetical', 'Alphabetical'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSortBy(value)}
            className={`px-sm py-xs rounded text-sm font-semibold border-none cursor-pointer transition-colors ${
              sortBy === value
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-transparent text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="text-on-surface-variant py-lg text-center">No courses match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {sorted.map((pkg) => (
            <CourseCard
              key={pkg.manifest.id}
              manifest={pkg.manifest}
              nodeCount={pkg.nodeCount}
              badgeCount={pkg.availableBadges}
              earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
              progress={progress[pkg.manifest.id] ?? null}
              onStart={() => onStartCourse(pkg.rootDir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
