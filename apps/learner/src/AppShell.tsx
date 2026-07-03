import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  RuntimeThemeProvider,
  FontLoader,
  TopAppBar,
  useThemePreference,
  useRuntimeOptional,
} from '@open-edu/runtime';
import type { LoadedPackage, PackageSummary, LoadedBundle, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { getOrderedNodes } from '@open-edu/workflow';
import { Home, TrendingUp, BookOpen, Settings, Library } from 'lucide-react';
import { AppSidebar, AppLayout, FontSizeProvider } from '@open-edu/design-system';
import type {
  AppSidebarItem,
  AppSidebarSection,
  AppSidebarStepItem,
} from '@open-edu/design-system';
import { CourseRuntime } from './CourseRuntime';
import { HomePage } from './HomePage';
import { CatalogPage } from './CatalogPage';
import { ProgressDashboard } from './ProgressDashboard';
import { SettingsPage } from './SettingsPage';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';
import { BundleOverviewPage } from './BundleOverviewPage';
import { CollectionBinderPage } from './CollectionBinderPage';
import { Pipili } from './components/Pipili';
import { getBundleProgress } from './bundleProgressStorage';

export type AppView =
  | { view: 'home' }
  | { view: 'catalog' }
  | { view: 'progress' }
  | { view: 'settings' }
  | { view: 'course'; packageId: string; bundleId?: string; moduleId?: string }
  | { view: 'bundleOverview'; bundleId: string }
  | { view: 'collection' };

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

  const navItems: AppSidebarItem[] = [
    { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" /> },
    { id: 'progress', label: 'My Progress', icon: <TrendingUp className="h-5 w-5" /> },
    { id: 'collection', label: 'Collection Binder', icon: <Library className="h-5 w-5" /> },
    { id: 'catalog', label: 'Course Catalog', icon: <BookOpen className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ];

  const currentNavId =
    view.view === 'bundleOverview'
      ? 'catalog'
      : view.view === 'collection'
        ? 'collection'
        : view.view;

  const handleNavAction = useCallback(
    (id: string) => {
      switch (id) {
        case 'home':
          handleNavigate({ view: 'home' });
          break;
        case 'catalog':
          handleNavigate({ view: 'catalog' });
          break;
        case 'progress':
          handleNavigate({ view: 'progress' });
          break;
        case 'collection':
          handleNavigate({ view: 'collection' });
          break;
        case 'settings':
          handleNavigate({ view: 'settings' });
          break;
      }
    },
    [handleNavigate],
  );

  function CourseStepWrapper(): JSX.Element | null {
    const runtime = useRuntimeOptional();
    if (!runtime || !isCourseView) return null;

    const orderedIds = getOrderedNodes(
      runtime.loadedPackage.workflow!,
      runtime.loadedPackage.manifest.entry!,
    );
    if (orderedIds.length === 0) return null;

    const items: AppSidebarStepItem[] = orderedIds.map((nodeId) => {
      const node = runtime.loadedPackage.nodes.find((n) => n.relativePath === nodeId);
      const title = node
        ? (node.node.title ?? nodeId.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
        : nodeId;
      let status: 'current' | 'completed' | 'future';
      if (nodeId === runtime.currentNodeId) status = 'current';
      else if (runtime.visitedNodes.includes(nodeId)) status = 'completed';
      else status = 'future';
      return {
        id: nodeId,
        label: title,
        status,
        onClick: () => runtime.navigateToNode(nodeId),
      };
    });

    const section: AppSidebarSection = { title: 'Course Steps', items };
    return (
      <AppSidebar
        items={navItems}
        currentItemId={currentNavId}
        onNavigate={handleNavAction}
        sections={[section]}
        onBack={{ label: 'Back to Catalog', onClick: handleBackToCatalog }}
      />
    );
  }

  return (
    <RuntimeThemeProvider themeId={themeId}>
      <FontLoader />
      <FontSizeProvider>
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
              <CourseStepWrapper />
            </CourseRuntime>
          </div>
        ) : (
          <AppLayout
            sidebar={
              <AppSidebar
                items={navItems}
                currentItemId={currentNavId}
                onNavigate={handleNavAction}
              />
            }
            topBar={<TopAppBar breadcrumbs={getBreadcrumbs()} showA11yControls />}
          >
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
              {view.view === 'collection' && <CollectionBinderPage packages={packageEntries} />}
            </main>
          </AppLayout>
        )}
        {!isCourseView && (
          <Pipili
            mood={view.view === 'home' ? 'idle' : view.view === 'catalog' ? 'curious' : 'content'}
            visible
          />
        )}
        <CourseExitWarningDialog
          open={showExitWarning}
          onStay={handleExitStay}
          onLeave={handleExitLeave}
        />
      </div>
      </FontSizeProvider>
    </RuntimeThemeProvider>
  );
}
