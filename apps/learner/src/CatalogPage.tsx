import { useMemo, useState } from 'react';
import type { PackageSummary, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import {
  BundleCard,
  BundleCardWithModule,
  Button,
  CourseCardWithModule,
  EmptyState,
  PageHeader,
  SectionDivider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-edu/design-system';
import type { AppView } from './AppShell';

export interface CatalogPageProps {
  packages: PackageSummary[];
  bundleSummaries?: BundleSummary[];
  bundleProgress?: Record<string, BundleProgressSnapshot>;
  onStartCourse: (packageDir: string) => void;
  onStartBundle?: (bundleId: string) => void;
  onNavigate?: (view: AppView) => void;
}

export function CatalogPage({
  packages,
  bundleSummaries,
  bundleProgress,
  onStartCourse,
  onStartBundle,
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
        <h1 className="text-h1 font-display text-on-surface mb-lg">Courses</h1>
        <EmptyState
          variant="no-courses"
          heading="No courses yet"
          description="Start exploring to build your learning path."
          action={<Button onClick={() => onNavigate?.({ view: 'catalog' })}>Browse Catalog</Button>}
        />
      </div>
    );
  }

  return (
    <div className="p-xl mx-auto max-w-7xl" data-testid="catalog-page">
      <PageHeader eyebrow="Catalog" title="Course Catalog" className="mb-xl" />

      {continueList.length > 0 && (
        <section className="mb-xl" data-testid="continue-learning-shelf">
          <div className="mb-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-h2 font-display text-on-surface">Continue Learning</h2>
              <span className="bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 text-xs">
                {inProgressCourses.length} in progress
              </span>
            </div>
            {onNavigate && (
              <button
                className="text-primary text-xs font-semibold hover:underline"
                onClick={() => onNavigate({ view: 'progress' })}
              >
                View all →
              </button>
            )}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
            {continueList.map((pkg) => (
              <CourseCardWithModule
                key={pkg.manifest.id}
                progress={progress[pkg.manifest.id] ?? null}
                badgeCount={badgeCounts[pkg.manifest.id] ?? 0}
              >
                <CourseCard
                  manifest={pkg.manifest}
                  nodeCount={pkg.nodeCount}
                  badgeCount={pkg.availableBadges}
                  earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
                  progress={progress[pkg.manifest.id] ?? null}
                  onStart={() => onStartCourse(pkg.rootDir)}
                />
              </CourseCardWithModule>
            ))}
          </div>
        </section>
      )}

      {continueList.length > 0 && bundleSummaries && bundleSummaries.length > 0 && (
        <SectionDivider density="minimal" className="mb-xl" />
      )}

      {bundleSummaries && bundleSummaries.length > 0 && (
        <section className="mb-xl" data-testid="bundle-list-section">
          <h2 className="text-h2 font-display text-on-surface mb-md">Learning Bundles</h2>
          <div className="gap-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {bundleSummaries.map((bundle) => {
              const prog = bundleProgress?.[bundle.manifest.id];
              const completedModules = prog
                ? Object.values(prog.moduleStatuses).filter((s) => s === 'completed').length
                : 0;
              return (
                <BundleCardWithModule
                  key={bundle.manifest.id}
                  completedModules={completedModules}
                  totalModules={bundle.moduleCount}
                >
                  <BundleCard
                    title={bundle.manifest.title}
                    description={bundle.manifest.description}
                    moduleCount={bundle.moduleCount}
                    activityCount={bundle.totalNodeCount}
                    completedModules={completedModules}
                    totalModules={bundle.moduleCount}
                    isStarted={prog !== undefined}
                    onStart={() => onStartBundle?.(bundle.manifest.id)}
                  />
                </BundleCardWithModule>
              );
            })}
          </div>
        </section>
      )}

      <SectionDivider density="minimal" className="mb-xl" />

      {tags.length > 0 && (
        <div className="gap-sm mb-md flex flex-wrap" data-testid="filter-chips">
          <Button
            variant={activeTag === null ? 'default' : 'outline'}
            size="sm"
            className="rounded-full px-3"
            onClick={() => setActiveTag(null)}
          >
            All
          </Button>
          {tags.map((tag) => (
            <Button
              key={tag}
              variant={activeTag === tag ? 'default' : 'outline'}
              size="sm"
              className="rounded-full px-3"
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      <div className="gap-md mb-md flex items-center" data-testid="sort-controls">
        <span className="text-on-surface-variant text-sm font-semibold">Sort:</span>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as 'newest' | 'inProgress' | 'alphabetical')}
        >
          <SelectTrigger className="w-[180px]" aria-label="Sort by">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="inProgress">In Progress First</SelectItem>
            <SelectItem value="alphabetical">Alphabetical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          variant="no-results"
          heading="No matches found"
          description="Try different keywords or browse the full catalog."
          action={
            <Button variant="outline" onClick={() => setActiveTag(null)}>
              Clear Filter
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {sorted.map((pkg) => {
            const prog = progress[pkg.manifest.id] ?? null;
            return (
              <CourseCardWithModule
                key={pkg.manifest.id}
                progress={prog}
                badgeCount={badgeCounts[pkg.manifest.id] ?? 0}
              >
                <CourseCard
                  manifest={pkg.manifest}
                  nodeCount={pkg.nodeCount}
                  badgeCount={pkg.availableBadges}
                  earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
                  progress={prog}
                  onStart={() => onStartCourse(pkg.rootDir)}
                />
              </CourseCardWithModule>
            );
          })}
        </div>
      )}
    </div>
  );
}
