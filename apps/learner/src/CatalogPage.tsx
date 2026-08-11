import { useMemo, useState, useEffect, useCallback } from 'react';
import type { PackageSummary, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { CourseCard } from '@open-edu/runtime';
import type { CourseCardProps } from '@open-edu/runtime';
import { useTranslation } from '@open-edu/i18n';
import { getAllProgress, type ProgressData } from './progressStorage';
import { getAllBadges, type BadgesData } from './badgesStorage';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  PageHeader,
  SectionDivider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  getCourseCardImage,
} from '@open-edu/design-system';
import type { AppView } from './AppShell';
import { RotateCcw, Trash2 } from 'lucide-react';
import { InstallCourseDialog } from './components/InstallCourseDialog.js';
import { installFromSource } from './courseDownload';
import { AvailableUpdatesList } from './components/AvailableUpdatesList';
import { parseCatalog, catalogSource } from '@open-edu/oep-distribution';
import type { Catalog, CatalogPackageEntry, InstallResult } from '@open-edu/oep-distribution';
import { proxyFetch, proxyUrl } from './oep-proxy/client';
import { toast } from 'sonner';
import type { StoredCourse, StoredBundle } from '@open-edu/storage';
import { deleteCourse, deleteBundle } from '@open-edu/storage';
import { isOepCourse, storedBundleToBundleSummary } from './oepAdapters';

const overlayActionButtonClassName =
  'h-8 w-8 rounded-full p-0 flex items-center justify-center bg-surface-container-high/90 hover:bg-surface-container-highest shadow-sm backdrop-blur transition-all';

const overlayActionsClassName =
  'absolute bottom-3 right-3 z-10 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100';

/**
 * Derives a course-like progress snapshot from bundle progress so bundles can
 * render through the same `CourseCard` as single courses. Visited nodes are
 * flattened across modules (namespaced by module id to avoid collisions) and a
 * bundle is considered completed when every module is completed.
 */
function bundleToCourseProgress(
  bundle: BundleSummary,
  prog: BundleProgressSnapshot | undefined,
): CourseCardProps['progress'] {
  if (!prog) return null;
  const visitedNodes = Object.values(prog.moduleProgress).flatMap((m) =>
    m.visitedNodes.map((n) => `${m.moduleId}/${n}`),
  );
  const statuses = Object.values(prog.moduleStatuses);
  const isCompleted = statuses.length > 0 && statuses.every((s) => s === 'completed');
  return {
    packageId: bundle.manifest.id,
    packageVersion: bundle.manifest.version,
    currentNodeId: prog.currentModuleId ?? bundle.manifest.id,
    visitedNodes,
    scores: {},
    isCompleted,
    updatedAt: prog.updatedAt,
  };
}

export interface CatalogPageProps {
  packages: PackageSummary[];
  bundleSummaries?: BundleSummary[];
  bundleProgress?: Record<string, BundleProgressSnapshot>;
  modulePackages?: PackageSummary[];
  onStartCourse: (packageDir: string) => void;
  onStartBundle?: (bundleId: string) => void;
  onNavigate?: (view: AppView) => void;
  onRequestReset?: (id: string, title: string, isBundle: boolean) => void;
  installedCourses?: StoredCourse[];
  installedBundles?: StoredBundle[];
  onRefreshInstalled?: () => Promise<void>;
  onRemoveInstalled?: () => Promise<void>;
}

export function CatalogPage({
  packages,
  bundleSummaries,
  bundleProgress,
  modulePackages = [],
  onStartCourse,
  onStartBundle,
  onNavigate,
  onRequestReset,
  installedCourses = [],
  installedBundles = [],
  onRefreshInstalled,
  onRemoveInstalled,
}: CatalogPageProps): JSX.Element {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<ProgressData>({});
  const [badgeData, setBadgeData] = useState<BadgesData>({});
  useEffect(() => {
    getAllProgress().then(setProgress);
    getAllBadges().then(setBadgeData);
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    isBundle?: boolean;
  } | null>(null);

  const installedIds = useMemo(
    () => new Set(installedCourses.map((c) => c.id)),
    [installedCourses],
  );

  const installedBundleIds = useMemo(
    () => new Set(installedBundles.map((b) => b.id)),
    [installedBundles],
  );

  const handleInstall = useCallback(
    async (source: Parameters<typeof installFromSource>[0]) => {
      const result = await installFromSource(source);
      if (result.success && onRefreshInstalled) {
        await onRefreshInstalled();
      }
      return result;
    },
    [onRefreshInstalled],
  );

  const handleDeleteInstalled = useCallback(
    (courseId: string, title: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteTarget({ id: courseId, title });
    },
    [],
  );

  const handleDeleteInstalledBundle = useCallback(
    (bundleId: string, title: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteTarget({ id: bundleId, title, isBundle: true });
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.isBundle) {
      await deleteBundle(deleteTarget.id);
    } else {
      await deleteCourse(deleteTarget.id);
    }
    setDeleteTarget(null);
    if (onRemoveInstalled) {
      await onRemoveInstalled();
    }
  }, [deleteTarget, onRemoveInstalled]);

  const cancelDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const badgeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const pkgId of Object.keys(progress)) {
      counts[pkgId] = (badgeData[pkgId] ?? []).length;
    }
    return counts;
  }, [progress, badgeData]);

  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'inProgress' | 'alphabetical'>('newest');
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [remoteCatalog, setRemoteCatalog] = useState<Catalog | null>(null);
  const [remoteCatalogError, setRemoteCatalogError] = useState(false);

  const allBundleSummaries = useMemo(() => {
    const map = new Map<string, BundleSummary>();
    for (const b of bundleSummaries ?? []) {
      map.set(b.manifest.id, b);
    }
    for (const stored of installedBundles) {
      if (!map.has(stored.id)) {
        map.set(stored.id, storedBundleToBundleSummary(stored));
      }
    }
    return Array.from(map.values());
  }, [bundleSummaries, installedBundles]);

  useEffect(() => {
    const catalogUrl = import.meta.env.VITE_CATALOG_URL as string | undefined;
    if (catalogUrl) {
      proxyFetch(catalogUrl)
        .then((response) => response.json())
        .then((data) => parseCatalog(data))
        .then((catalog) => {
          setRemoteCatalog(catalog);
          setRemoteCatalogError(false);
        })
        .catch(() => setRemoteCatalogError(true));
    }
  }, []);

  const localIds = useMemo(() => new Set(packages.map((p) => p.manifest.id)), [packages]);

  const remotePackages = useMemo<PackageSummary[]>(() => {
    if (!remoteCatalog) return [];
    return remoteCatalog.packages
      .filter((entry) => !installedIds.has(entry.id) && !localIds.has(entry.id))
      .map((entry) => ({
        manifest: {
          id: entry.id,
          title: entry.title,
          version: entry.latestVersion,
          author: entry.author ?? '',
          entry: '',
          tags: entry.tags,
          image: entry.thumbnail,
        },
        nodeCount: 0,
        availableBadges: 0,
        rootDir: `remote:${entry.id}`,
      }));
  }, [remoteCatalog, installedIds, localIds]);

  const allPackages = useMemo(() => [...packages, ...remotePackages], [packages, remotePackages]);

  const handleRemoteInstall = useCallback(
    async (entry: CatalogPackageEntry) => {
      if (installingId === entry.id) return;
      const version = entry.versions[entry.versions.length - 1]!;
      setInstallingId(entry.id);
      try {
        const source = catalogSource({
          downloadUrl: proxyUrl(version.downloadUrl),
          label: `${entry.title} v${version.version}`,
          expectedChecksum: version.checksum,
        });
        const result = await installFromSource(source);
        if (result.success) {
          toast.success(t('learner.install.success'));
          if (onRefreshInstalled) {
            await onRefreshInstalled();
          }
        } else {
          toast.error(t(installErrorKey(result)));
        }
      } catch {
        toast.error(t('learner.install.error_unknown'));
      } finally {
        setInstallingId(null);
      }
    },
    [installingId, onRefreshInstalled, t],
  );

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    allPackages.forEach((p) => (p.manifest.tags ?? []).forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [allPackages]);

  const filtered = useMemo(() => {
    return activeTag
      ? allPackages.filter((p) => (p.manifest.tags ?? []).includes(activeTag!))
      : allPackages;
  }, [allPackages, activeTag]);

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

  const inProgressModules = useMemo(
    () =>
      modulePackages.filter((p) => {
        const snap = progress[p.manifest.id];
        return snap && !snap.isCompleted;
      }),
    [modulePackages, progress],
  );

  const inProgressItems = useMemo(
    () => [...inProgressCourses, ...inProgressModules],
    [inProgressCourses, inProgressModules],
  );

  const continueList = useMemo(() => inProgressItems.slice(0, 4), [inProgressItems]);

  return (
    <div className="p-xl max-w-content mx-auto w-full" data-testid="catalog-page">
      <PageHeader
        eyebrow={t('learner.catalog.eyebrow')}
        title={t('learner.catalog.page_title')}
        className="mb-xl"
      />

      <div className="mb-lg flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setShowInstallDialog(true)}
          data-testid="open-install-dialog-button"
        >
          {t('learner.install.title')}
        </Button>
        <Button variant="outline" onClick={() => onNavigate?.({ view: 'catalog-install' })}>
          {t('learner.catalog.btn_catalog_install')}
        </Button>
      </div>

      {remoteCatalogError && (
        <p
          className="text-error text-caption mb-lg"
          data-testid="remote-catalog-error"
          role="status"
        >
          {t('learner.catalog.remote_error')}
        </p>
      )}

      <AvailableUpdatesList catalog={remoteCatalog} />

      <InstallCourseDialog
        open={showInstallDialog}
        onClose={() => setShowInstallDialog(false)}
        onInstall={handleInstall}
      />

      {allPackages.length === 0 ? (
        <EmptyState
          variant="no-courses"
          heading={t('learner.catalog.empty_heading')}
          description={t('learner.catalog.empty_description')}
          action={
            <Button onClick={() => setShowInstallDialog(true)} data-testid="empty-install-button">
              {t('learner.install.title')}
            </Button>
          }
        />
      ) : (
        <>
          {continueList.length > 0 && (
            <section className="mb-xl" data-testid="continue-learning-shelf">
              <div className="mb-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-h2 font-display text-on-surface">
                    {t('learner.catalog.continue_learning')}
                  </h2>
                  <span className="bg-surface-container text-on-surface-variant text-caption rounded-full px-2 py-0.5">
                    {t('learner.catalog.in_progress_count', {
                      count: String(inProgressItems.length),
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
                  <div
                    key={pkg.manifest.id}
                    className="group relative flex h-full flex-col overflow-hidden"
                  >
                    <CourseCard
                      manifest={pkg.manifest}
                      nodeCount={pkg.nodeCount}
                      badgeCount={pkg.availableBadges}
                      earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
                      progress={progress[pkg.manifest.id] ?? null}
                      onStart={() => onStartCourse(pkg.rootDir)}
                      image={getCourseCardImage({
                        image: pkg.manifest.image,
                        tags: pkg.manifest.tags,
                        title: pkg.manifest.title,
                      })}
                    />
                    {progress[pkg.manifest.id] && (
                      <div className={overlayActionsClassName} data-testid="card-overlay-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid="reset-button"
                          className={overlayActionButtonClassName}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestReset?.(pkg.manifest.id, pkg.manifest.title, false);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          <span className="sr-only">{t('learner.reset.button')}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {continueList.length > 0 && allBundleSummaries.length > 0 && (
            <SectionDivider density="minimal" className="mb-xl" />
          )}

          {allBundleSummaries.length > 0 && (
            <section className="mb-xl" data-testid="bundle-list-section">
              <h2 className="text-h2 font-display text-on-surface mb-md">
                {t('learner.catalog.learning_bundles')}
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                {allBundleSummaries.map((bundle) => {
                  const prog = bundleProgress?.[bundle.manifest.id];
                  const courseProgress = bundleToCourseProgress(bundle, prog);
                  const earnedBadgeCount =
                    (badgeData[bundle.manifest.id]?.length ?? 0) +
                    bundle.moduleSummaries.reduce(
                      (sum, m) => sum + (badgeData[m.manifest.id]?.length ?? 0),
                      0,
                    );
                  const totalBadgeCount = bundle.moduleSummaries.reduce(
                    (sum, m) => sum + m.availableBadges,
                    0,
                  );
                  return (
                    <div
                      key={bundle.manifest.id}
                      className="group relative flex h-full flex-col overflow-hidden"
                    >
                      <CourseCard
                        manifest={{
                          id: bundle.manifest.id,
                          title: bundle.manifest.title,
                          version: bundle.manifest.version,
                          author: bundle.manifest.author ?? '',
                          entry: '',
                          image: bundle.manifest.image,
                        }}
                        nodeCount={bundle.totalNodeCount}
                        badgeCount={totalBadgeCount}
                        earnedBadgeCount={earnedBadgeCount}
                        progress={courseProgress}
                        onStart={() => onStartBundle?.(bundle.manifest.id)}
                        badgeLabel={t('learner.catalog.bundle_badge')}
                        image={getCourseCardImage({
                          image: bundle.manifest.image,
                          subject: bundle.manifest.subject,
                          title: bundle.manifest.title,
                        })}
                      />
                      {(prog || installedBundleIds.has(bundle.manifest.id)) && (
                        <div className={overlayActionsClassName} data-testid="card-overlay-actions">
                          {prog && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid="reset-button"
                              className={overlayActionButtonClassName}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestReset?.(bundle.manifest.id, bundle.manifest.title, true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              <span className="sr-only">{t('learner.reset.button')}</span>
                            </Button>
                          )}
                          {installedBundleIds.has(bundle.manifest.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid="delete-installed-button"
                              className={overlayActionButtonClassName}
                              onClick={(e) =>
                                handleDeleteInstalledBundle(
                                  bundle.manifest.id,
                                  bundle.manifest.title,
                                  e,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">
                                {t('learner.catalog.remove_installed')}
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
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
                <SelectItem value="alphabetical">
                  {t('learner.catalog.sort_alphabetical')}
                </SelectItem>
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
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5"
              data-testid="course-list-section"
            >
              {sorted.map((pkg) => {
                const prog = progress[pkg.manifest.id] ?? null;
                const isInstalled = installedIds.has(pkg.manifest.id);
                const isOep = isOepCourse(pkg.rootDir);
                const isRemote = pkg.rootDir.startsWith('remote:');
                const remoteEntry = isRemote
                  ? remoteCatalog?.packages.find((e) => e.id === pkg.manifest.id)
                  : undefined;
                const showReset = !!progress[pkg.manifest.id];
                const showDelete = isOep;
                const badgeLabel = isInstalled
                  ? t('learner.catalog.installed_badge')
                  : isRemote
                    ? installingId === pkg.manifest.id
                      ? t('learner.install.installing')
                      : t('learner.catalog.remote_badge')
                    : undefined;
                const indicator = badgeLabel ? (
                  <span className="bg-primary/10 text-primary text-caption inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium">
                    {badgeLabel}
                  </span>
                ) : undefined;
                return (
                  <div
                    key={pkg.manifest.id}
                    className="group relative flex h-full flex-col overflow-hidden"
                  >
                    <CourseCard
                      manifest={pkg.manifest}
                      nodeCount={pkg.nodeCount}
                      badgeCount={pkg.availableBadges}
                      earnedBadgeCount={badgeCounts[pkg.manifest.id] ?? 0}
                      progress={prog}
                      onStart={() =>
                        remoteEntry ? handleRemoteInstall(remoteEntry) : onStartCourse(pkg.rootDir)
                      }
                      image={getCourseCardImage({
                        image: pkg.manifest.image,
                        tags: pkg.manifest.tags,
                        title: pkg.manifest.title,
                      })}
                      metaText={isRemote ? t('learner.catalog.remote_meta') : undefined}
                      indicator={indicator}
                    />
                    {(showReset || showDelete) && (
                      <div className={overlayActionsClassName} data-testid="card-overlay-actions">
                        {showReset && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid="reset-button"
                            className={overlayActionButtonClassName}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestReset?.(pkg.manifest.id, pkg.manifest.title, false);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span className="sr-only">{t('learner.reset.button')}</span>
                          </Button>
                        )}
                        {showDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid="delete-installed-button"
                            className={overlayActionButtonClassName}
                            onClick={(e) =>
                              handleDeleteInstalled(pkg.manifest.id, pkg.manifest.title, e)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">{t('learner.catalog.remove_installed')}</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) cancelDelete();
        }}
      >
        <DialogContent
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle id="delete-dialog-title" className="text-h2 font-display">
              {t('learner.catalog.delete_confirm_title')}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription id="delete-dialog-description">
            {t('learner.catalog.delete_confirm_description', {
              courseTitle: deleteTarget?.title ?? '',
            })}
          </DialogDescription>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={cancelDelete} data-testid="delete-cancel-button">
              {t('learner.catalog.delete_cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              data-testid="delete-confirm-button"
            >
              {t('learner.catalog.delete_confirm_button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const installErrorKeyMap: Record<string, string> = {
  ARCHIVE_TOO_LARGE: 'learner.install.error_archive_too_large',
  DECOMPRESSED_TOO_LARGE: 'learner.install.error_decompressed_too_large',
  MALFORMED_ARCHIVE: 'learner.install.error_malformed_archive',
  CHECKSUM_MISMATCH: 'learner.install.error_checksum_mismatch',
  MANIFEST_MISMATCH: 'learner.install.error_manifest_mismatch',
  COURSE_VALIDATION_ERROR: 'learner.install.error_course_validation',
  SOURCE_READ_ERROR: 'learner.install.error_source_read',
  STORAGE_ERROR: 'learner.install.error_storage',
  VERSION_DOWNGRADE: 'learner.install.error_version_downgrade',
  VERSION_SAME: 'learner.install.error_version_same',
  NOT_FOUND: 'learner.install.error_not_found',
};

function installErrorKey(result: InstallResult): string {
  return installErrorKeyMap[result.errorCode ?? ''] ?? 'learner.install.error_unknown';
}
