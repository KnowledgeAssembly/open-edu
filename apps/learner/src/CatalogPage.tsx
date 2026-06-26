import { useMemo } from 'react';
import type { PackageSummary } from '@open-edu/core';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';

export interface CatalogPageProps {
  packages: PackageSummary[];
  onStartCourse: (packageDir: string) => void;
}

export function CatalogPage({ packages, onStartCourse }: CatalogPageProps): JSX.Element {
  const progress = getAllProgress();

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [pkgId, snap] of Object.entries(progress)) {
      counts[pkgId] = Object.keys(snap.scores ?? {}).length;
    }
    return counts;
  }, [progress]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
        {packages.map((pkg) => (
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
    </div>
  );
}
