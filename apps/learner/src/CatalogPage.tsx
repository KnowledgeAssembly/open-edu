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
  CourseCardWithModule,
  EmptyState,
  Progress,
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
        <h1 className="text-h1 font-display text-on-surface mb-lg font-bold">Courses</h1>
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
      <h1 className="text-h1 font-display text-on-surface mb-lg font-bold">Course Catalog</h1>

      {continueList.length > 0 && (
        <section className="mb-xl" data-testid="continue-learning-shelf">
          <div className="mb-md flex items-center justify-between">
            <h2 className="text-h2 font-display text-on-surface font-bold">Continue Learning</h2>
            {onNavigate && (
              <Button variant="link" size="sm" onClick={() => onNavigate({ view: 'progress' })}>
                View all
              </Button>
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
          <h2 className="text-h2 font-display text-on-surface mb-md font-bold">Learning Bundles</h2>
          <div className="gap-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {bundleSummaries.map((bundle) => {
              const prog = bundleProgress?.[bundle.manifest.id];
              const completedModules = prog
                ? Object.values(prog.moduleStatuses).filter((s) => s === 'completed').length
                : 0;
              return (
                <Card
                  key={bundle.manifest.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => onStartBundle?.(bundle.manifest.id)}
                  data-testid="bundle-card"
                  data-bundle-id={bundle.manifest.id}
                >
                  <CardHeader>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="secondary">Bundle</Badge>
                      <CardTitle className="truncate text-lg">{bundle.manifest.title}</CardTitle>
                    </div>
                    <CardDescription>
                      {bundle.manifest.description ?? `${bundle.moduleCount} modules`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex gap-4 text-xs">
                      <span>{bundle.moduleCount} modules</span>
                      <span>{bundle.totalNodeCount} activities</span>
                    </div>
                    {prog && (
                      <div className="mt-2">
                        <Progress
                          value={Math.round((completedModules / bundle.moduleCount) * 100)}
                          className="h-2"
                        />
                        <span className="text-muted-foreground mt-1 block text-xs">
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
          {sorted.map((pkg) => (
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
      )}
    </div>
  );
}
