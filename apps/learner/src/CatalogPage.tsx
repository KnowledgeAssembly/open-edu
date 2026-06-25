import { useState, useEffect, useCallback } from 'react';
import { scanPackages } from '@open-edu/core';
import type { PackageSummary } from '@open-edu/core';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';

export interface CatalogPageProps {
  packageDir: string;
  onStartCourse: (packageDir: string) => void;
}

export function CatalogPage({ packageDir, onStartCourse }: CatalogPageProps): JSX.Element {
  const [packages, setPackages] = useState<PackageSummary[]>([]);

  const load = useCallback(() => {
    const results = scanPackages(packageDir);
    setPackages(results);
  }, [packageDir]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = getAllProgress();

  if (packages.length === 0) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Courses</h1>
        <p>No courses found.</p>
        <button
          type="button"
          onClick={load}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: 'var(--oe-radius, 8px)',
            backgroundColor: 'var(--oe-color-primary, #2563eb)',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
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
