import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { RuntimeThemeProvider, FontLoader, TopAppBar, useThemePreference } from '@open-edu/runtime';
import type { LoadedPackage, PackageSummary, LoadedBundle, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { LeftNav, type AppView } from './LeftNav';
import { CourseRuntime } from './CourseRuntime';
import { HomePage } from './HomePage';
import { CatalogPage } from './CatalogPage';
import { ProgressDashboard } from './ProgressDashboard';
import { SettingsPage } from './SettingsPage';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';
import { BundleOverviewPage } from './BundleOverviewPage';
import { getBundleProgress } from './bundleProgressStorage';

export interface AppShellProps {
  catalogPackages: PackageSummary[];
  packageEntries: Record<string, LoadedPackage>;
  catalogBundles: BundleSummary[];
  bundleEntries: Record<string, LoadedBundle>;
}

export function AppShell({
  catalogPackages,
  packageEntries,
  catalogBundles,
  bundleEntries,
}: AppShellProps): JSX.Element {
  const [view, setView] = useState<AppView>({
    view: 'home',
  });
  const [themeId, setThemeId] = useThemePreference();
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [courseProgressCurrent, setCourseProgressCurrent] = useState(0);
  const [courseProgressTotal, setCourseProgressTotal] = useState(0);
  const pendingNavigation = useRef<AppView | null>(null);
  const preCourseView = useRef<AppView>({ view: 'home' });

  const [bundleProgress, setBundleProgress] = useState<Record<string, BundleProgressSnapshot>>(
    () => {
      const progress: Record<string, BundleProgressSnapshot> = {};
      for (const bundleId of Object.keys(bundleEntries)) {
        const saved = getBundleProgress(bundleId);
        if (saved) progress[bundleId] = saved;
      }
      return progress;
    },
  );

  const handleProgressUpdate = useCallback((current: number, total: number) => {
    setCourseProgressCurrent(current);
    setCourseProgressTotal(total);
  }, []);

  const isCourseInProgress = useMemo(() => {
    if (view.view !== 'course' || !view.packageId) return false;
    const pkg = packageEntries[view.packageId];
    if (!pkg) return false;
    return true;
  }, [view, packageEntries]);

  useEffect(() => {
    if (!isCourseInProgress || view.view !== 'course') return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePopState = () => {
      pendingNavigation.current = preCourseView.current;
      setShowExitWarning(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isCourseInProgress, view]);

  const handleNavigate = useCallback(
    (newView: AppView) => {
      if (newView.view === 'course') {
        if (!newView.packageId || !packageEntries[newView.packageId]) return;

        // Bundle module-to-module navigation: no exit warning
        const currentBundleId = view.view === 'course' ? view.bundleId : undefined;
        if (newView.bundleId && currentBundleId === newView.bundleId) {
          setView({
            view: 'course',
            packageId: newView.packageId,
            bundleId: newView.bundleId,
            moduleId: newView.moduleId,
          });
          return;
        }

        if (view.view === 'course' && view.packageId !== newView.packageId && isCourseInProgress) {
          pendingNavigation.current = newView;
          setShowExitWarning(true);
        } else {
          if (view.view !== 'course') {
            preCourseView.current = view;
          }
          const nav = newView.bundleId
            ? {
                view: 'course' as const,
                packageId: newView.packageId,
                bundleId: newView.bundleId,
                moduleId: newView.moduleId,
              }
            : { view: 'course' as const, packageId: newView.packageId };
          setView(nav);
        }
        return;
      }

      // Navigate to bundle overview while in a course
      if (newView.view === 'bundleOverview' && isCourseInProgress) {
        pendingNavigation.current = newView;
        setShowExitWarning(true);
        return;
      }

      if (isCourseInProgress) {
        pendingNavigation.current = newView;
        setShowExitWarning(true);
      } else {
        setView(newView);
      }
    },
    [packageEntries, isCourseInProgress, view],
  );

  const handleExitStay = useCallback(() => {
    setShowExitWarning(false);
    pendingNavigation.current = null;
  }, []);

  const handleExitLeave = useCallback(() => {
    setShowExitWarning(false);
    const pending = pendingNavigation.current;
    pendingNavigation.current = null;
    if (pending) {
      setView(pending);
    }
  }, []);

  const handleStartCourse = useCallback(
    (packageDir: string) => {
      const pkg = Object.values(packageEntries).find((p) => p.rootDir === packageDir);
      if (pkg) {
        setView({ view: 'course', packageId: pkg.manifest.id });
      }
    },
    [packageEntries],
  );

  const handleStartBundle = useCallback((bundleId: string) => {
    setView({ view: 'bundleOverview', bundleId });
  }, []);

  const handleStartBundleModule = useCallback((bundleId: string, moduleId: string) => {
    setView({ view: 'course', packageId: moduleId, bundleId, moduleId });
  }, []);

  const handleBackToCatalog = useCallback(() => {
    setView({ view: 'catalog' });
  }, []);

  const coursePkg = useMemo<LoadedPackage | undefined>(() => {
    if (view.view !== 'course' || !view.packageId) return undefined;
    return packageEntries[view.packageId];
  }, [view, packageEntries]);

  const courseBundle = useMemo<LoadedBundle | undefined>(() => {
    if (view.view !== 'course' || !view.bundleId) return undefined;
    const bundle = bundleEntries[view.bundleId];
    if (!bundle) return undefined;
    return bundle;
  }, [view, bundleEntries]);

  const getBreadcrumbs = () => {
    switch (view.view) {
      case 'home':
        return [{ label: 'Home' }];
      case 'catalog':
        return [{ label: 'Course Catalog' }];
      case 'progress':
        return [{ label: 'My Progress' }];
      case 'settings':
        return [{ label: 'Settings' }];
      case 'bundleOverview': {
        const bundle = bundleEntries[view.bundleId];
        return [{ label: 'Course Catalog' }, { label: bundle?.manifest.title ?? 'Bundle' }];
      }
      case 'course': {
        const breadcrumbs = [{ label: coursePkg?.manifest.title ?? 'Course' }];
        if (view.bundleId) {
          const bundle = bundleEntries[view.bundleId];
          if (bundle) {
            breadcrumbs.unshift({ label: bundle.manifest.title });
          }
        }
        return breadcrumbs;
      }
      default:
        return [{ label: 'Home' }];
    }
  };

  const isCourseView = view.view === 'course';

  return (
    <RuntimeThemeProvider themeId={themeId}>
      <FontLoader />
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
        {isCourseView && coursePkg ? (
          <div className="flex-1 flex flex-col min-w-0">
            <TopAppBar
              breadcrumbs={getBreadcrumbs()}
              isCourseView
              courseTitle={coursePkg.manifest.title}
              showA11yControls
              progressCurrent={courseProgressCurrent}
              progressTotal={courseProgressTotal}
            />
            <CourseRuntime
              pkg={coursePkg}
              onBackToCatalog={handleBackToCatalog}
              hideLayoutShellHeader
              onProgressUpdate={handleProgressUpdate}
              bundleContext={
                courseBundle
                  ? {
                      bundleId: courseBundle.manifest.id,
                      bundle: courseBundle,
                      onBundleSnapshot: (snapshot) => {
                        setBundleProgress((prev) => ({
                          ...prev,
                          [courseBundle.manifest.id]: snapshot,
                        }));
                      },
                    }
                  : undefined
              }
            >
              <LeftNav
                currentView={view}
                onNavigate={handleNavigate}
                onBackToCatalog={handleBackToCatalog}
              />
            </CourseRuntime>
          </div>
        ) : (
          <>
            <LeftNav currentView={view} onNavigate={handleNavigate} />
            <div className="flex-1 flex flex-col min-w-0">
              <TopAppBar breadcrumbs={getBreadcrumbs()} showA11yControls />
              <main className="flex-1 overflow-y-auto bg-surface" data-testid="app-main">
                {view.view === 'catalog' && (
                  <CatalogPage
                    packages={catalogPackages}
                    bundleSummaries={catalogBundles}
                    bundleProgress={bundleProgress}
                    onStartCourse={handleStartCourse}
                    onStartBundle={handleStartBundle}
                    onNavigate={handleNavigate}
                  />
                )}
                {view.view === 'home' && (
                  <HomePage
                    onNavigate={handleNavigate}
                    catalogPackages={catalogPackages}
                    bundleEntries={bundleEntries}
                  />
                )}
                {(() => {
                  if (view.view !== 'bundleOverview' || !view.bundleId) return null;
                  const bundle = bundleEntries[view.bundleId];
                  if (!bundle) return null;
                  return (
                    <BundleOverviewPage
                      bundle={bundle}
                      bundleProgress={bundleProgress[view.bundleId] ?? null}
                      onStartModule={handleStartBundleModule}
                      onBackToCatalog={handleBackToCatalog}
                    />
                  );
                })()}
                {view.view === 'progress' && (
                  <ProgressDashboard
                    onNavigate={handleNavigate}
                    catalogPackages={catalogPackages}
                    packageEntries={packageEntries}
                  />
                )}
                {view.view === 'settings' && (
                  <SettingsPage currentThemeId={themeId} onThemeChange={setThemeId} />
                )}
              </main>
            </div>
          </>
        )}
        <CourseExitWarningDialog
          open={showExitWarning}
          onStay={handleExitStay}
          onLeave={handleExitLeave}
        />
      </div>
    </RuntimeThemeProvider>
  );
}
