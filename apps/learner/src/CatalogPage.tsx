import { useMemo, useState, useEffect } from 'react';
import type { PackageSummary, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { CourseCard } from '@open-edu/runtime';
import { useTranslation } from '@open-edu/i18n';
import { getAllProgress, type ProgressData } from './progressStorage';
import { getAllBadges, type BadgesData } from './badgesStorage';
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
import { InstallPrompt } from './components/InstallPrompt.js';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';

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
  const { t } = useTranslation();
  const installPrompt = useInstallPrompt();
  const [progress, setProgress] = useState<ProgressData>({});
  const [badgeData, setBadgeData] = useState<BadgesData>({});
  useEffect(() => {
    getAllProgress().then(setProgress);
    getAllBadges().then(setBadgeData);
  }, []);

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
        <h1 className="text-h1 font-display text-on-surface mb-lg">
          {t('learner.catalog.courses_heading')}
        </h1>
        <EmptyState
          variant="no-courses"
          heading={t('learner.catalog.empty_heading')}
          description={t('learner.catalog.empty_description')}
          action={
            <Button onClick={() => onNavigate?.({ view: 'catalog' })}>
              {t('learner.catalog.browse')}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-xl mx-auto w-full max-w-content" data-testid="catalog-page">
      <PageHeader
        eyebrow={t('learner.catalog.eyebrow')}
        title={t('learner.catalog.page_title')}
        className="mb-xl"
      />

      <InstallPrompt
        isInstallable={installPrompt.isInstallable}
        isInstalled={installPrompt.isInstalled}
        onInstall={installPrompt.install}
      />

      {continueList.length > 0 && (
        <section className="mb-xl" data-testid="continue-learning-shelf">
          <div className="mb-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-h2 font-display text-on-surface">
                {t('learner.catalog.continue_learning')}
              </h2>
              <span className="bg-surface-container text-on-surface-variant text-caption rounded-full px-2 py-0.5">
                {t('learner.catalog.in_progress_count', {
                  count: String(inProgressCourses.length),
                })}
              </span>
            </div>
            {onNavigate && (
              <button
                className="text-primary text-caption font-semibold hover:underline"
                onClick={() => onNavigate({ view: 'progress' })}
              >
                {t('learner.catalog.view_all')}
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
          <h2 className="text-h2 font-display text-on-surface mb-md">
            {t('learner.catalog.learning_bundles')}
          </h2>
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
            {t('learner.catalog.filter_all')}
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
        <span className="text-on-surface-variant text-body-ui font-semibold">
          {t('learner.catalog.sort_label')}
        </span>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as 'newest' | 'inProgress' | 'alphabetical')}
        >
          <SelectTrigger className="w-[180px]" aria-label={t('learner.catalog.sort_by_aria')}>
            <SelectValue placeholder={t('learner.catalog.sort_by')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t('learner.catalog.sort_newest')}</SelectItem>
            <SelectItem value="inProgress">{t('learner.catalog.in_progress_first')}</SelectItem>
            <SelectItem value="alphabetical">{t('learner.catalog.sort_alphabetical')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          variant="no-results"
          heading={t('learner.catalog.no_results_heading')}
          description={t('learner.catalog.no_results_description')}
          action={
            <Button variant="outline" onClick={() => setActiveTag(null)}>
              {t('learner.catalog.clear_filter')}
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
