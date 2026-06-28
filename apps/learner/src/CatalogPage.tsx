import { useMemo, useState } from 'react';
import type { PackageSummary, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { CourseCard } from '@open-edu/runtime';
import { getAllProgress } from './progressStorage';
import { getAllBadges } from './badgesStorage';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@open-edu/design-system';
import type { AppView } from './LeftNav';

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
              <Button variant="link" size="sm" onClick={() => onNavigate({ view: 'progress' })}>
                View all
              </Button>
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

      {bundleSummaries && bundleSummaries.length > 0 && (
        <section className="mb-xl" data-testid="bundle-list-section">
          <h2 className="text-h2 font-display font-bold text-on-surface mb-md">Learning Bundles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {bundleSummaries.map((bundle) => {
              const prog = bundleProgress?.[bundle.manifest.id];
              const completedModules = prog
                ? Object.values(prog.moduleStatuses).filter((s) => s === 'completed').length
                : 0;
              return (
                <Card
                  key={bundle.manifest.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onStartBundle?.(bundle.manifest.id)}
                  data-testid="bundle-card"
                  data-bundle-id={bundle.manifest.id}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">Bundle</Badge>
                      <CardTitle className="text-lg truncate">{bundle.manifest.title}</CardTitle>
                    </div>
                    <CardDescription>
                      {bundle.manifest.description ?? `${bundle.moduleCount} modules`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>{bundle.moduleCount} modules</span>
                      <span>{bundle.totalNodeCount} activities</span>
                    </div>
                    {prog && (
                      <div className="mt-2">
                        <Progress
                          value={Math.round((completedModules / bundle.moduleCount) * 100)}
                          className="h-2"
                        />
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {completedModules} of {bundle.moduleCount} complete
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-sm mb-md" data-testid="filter-chips">
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

      <div className="flex items-center gap-md mb-md" data-testid="sort-controls">
        <span className="text-sm text-on-surface-variant font-semibold">Sort:</span>
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
