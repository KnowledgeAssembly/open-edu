import type { PackageSummary } from '@open-edu/core';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';

export interface CatalogPageProps {
  packages: PackageSummary[];
  onStartCourse: (packageDir: string) => void;
}

export function CatalogPage({ packages, onStartCourse }: CatalogPageProps): JSX.Element {
  const progress = getAllProgress();

  if (packages.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Courses</h1>
        <p>No courses found.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }} data-testid="catalog-page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1.5rem' }}>Courses</h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {packages.map((pkg) => (
          <CourseCard
            key={pkg.manifest.id}
            manifest={pkg.manifest}
            nodeCount={pkg.nodeCount}
            badgeCount={pkg.availableBadges}
            earnedBadgeCount={0}
            progress={progress[pkg.manifest.id] ?? null}
            onStart={() => onStartCourse(pkg.rootDir)}
          />
        ))}
      </div>
    </div>
  );
}
