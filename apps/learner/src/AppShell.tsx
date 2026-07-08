import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useBlocker } from 'react-router-dom';
import {
  RuntimeThemeProvider,
  TopAppBar,
  useThemePreference,
  useRuntimeOptional,
} from '@open-edu/runtime';
import type { LoadedPackage, PackageSummary, LoadedBundle, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { getOrderedNodes } from '@open-edu/workflow';
import { Home, TrendingUp, BookOpen, Settings, Library } from 'lucide-react';
import {
  AppSidebar,
  AppLayout,
  FontSizeProvider,
  OpenEduLogo,
  AssemblyFlow,
} from '@open-edu/design-system';
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
import { CompanionProvider, useCompanion, CompanionPanel, ContextBridge } from './ai';
import { getBundleProgress } from './bundleProgressStorage';
import { useBreakTimer } from './useBreakTimer';
import { BreakNagBar } from './BreakNagBar';
import { BreakPage } from './BreakPage';

export type AppView =
  | { view: 'home' }
  | { view: 'catalog' }
  | { view: 'progress' }
  | { view: 'settings' }
  | { view: 'course'; packageId: string; bundleId?: string; moduleId?: string }
  | { view: 'bundleOverview'; bundleId: string }
  | { view: 'collection' }
  | { view: 'break' };

function viewToPath(view: AppView): string {
  switch (view.view) {
    case 'home':
      return '/';
    case 'catalog':
      return '/catalog';
    case 'progress':
      return '/progress';
    case 'settings':
      return '/settings';
    case 'collection':
      return '/collection';
    case 'break':
      return '/break';
    case 'bundleOverview':
      return `/bundle/${view.bundleId}`;
    case 'course': {
      const base = `/course/${view.packageId}`;
      if (view.bundleId && view.moduleId) return `${base}/${view.bundleId}/${view.moduleId}`;
      return base;
    }
  }
}

function pathToView(pathname: string, packageEntries: Record<string, LoadedPackage>): AppView {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { view: 'home' };
  const main = segments[0];
  if (main === 'catalog') return { view: 'catalog' };
  if (main === 'progress') return { view: 'progress' };
  if (main === 'settings') return { view: 'settings' };
  if (main === 'collection') return { view: 'collection' };
  if (main === 'break') return { view: 'break' };
  if (main === 'bundle' && segments[1]) return { view: 'bundleOverview', bundleId: segments[1] };
  if (main === 'course' && segments[1]) {
    if (!packageEntries[segments[1]]) return { view: 'home' };
    return {
      view: 'course',
      packageId: segments[1],
      bundleId: segments[2],
      moduleId: segments[3],
    };
  }
  return { view: 'home' };
}

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
  const navigate = useNavigate();
  const location = useLocation();

  const view = useMemo<AppView>(
    () => pathToView(location.pathname, packageEntries),
    [location.pathname, packageEntries],
  );

  const [themeId, setThemeId] = useThemePreference();
  const [courseProgressCurrent, setCourseProgressCurrent] = useState(0);
  const [courseProgressTotal, setCourseProgressTotal] = useState(0);

  const breakTimer = useBreakTimer();

  const handleTakeBreak = useCallback(() => {
    navigate('/break');
  }, [navigate]);

  const handleBackToLearning = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
    breakTimer.dismiss();
  }, [navigate, breakTimer]);

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
    if (!isCourseInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isCourseInProgress]);

  const blocker = useBlocker(({ nextLocation }) => {
    if (!isCourseInProgress) return false;
    if (nextLocation.pathname.startsWith('/course/')) return false;
    return true;
  });

  const showExitWarning = blocker.state === 'blocked';

  const handleNavigate = useCallback(
    (newView: AppView) => {
      if (newView.view === 'course' && newView.packageId && !packageEntries[newView.packageId])
        return;
      navigate(viewToPath(newView));
    },
    [packageEntries, navigate],
  );

  const handleExitStay = useCallback(() => {
    blocker.reset?.();
  }, [blocker]);

  const handleExitLeave = useCallback(() => {
    blocker.proceed?.();
  }, [blocker]);

  const handleStartCourse = useCallback(
    (packageDir: string) => {
      const pkg = Object.values(packageEntries).find((p) => p.rootDir === packageDir);
      if (pkg) {
        navigate(`/course/${pkg.manifest.id}`);
      }
    },
    [packageEntries, navigate],
  );

  const handleStartBundle = useCallback(
    (bundleId: string) => {
      navigate(`/bundle/${bundleId}`);
    },
    [navigate],
  );

  const handleStartBundleModule = useCallback(
    (bundleId: string, moduleId: string) => {
      navigate(`/course/${moduleId}/${bundleId}/${moduleId}`);
    },
    [navigate],
  );

  const handleBackToCatalog = useCallback(() => {
    navigate('/catalog');
  }, [navigate]);

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
      case 'break':
        return [{ label: 'Break' }];
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
      <div className="relative h-full overflow-hidden">
        <AssemblyFlow
          density="dense"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          aria-hidden="true"
        />
        <AppSidebar
          logo={<OpenEduLogo variant="lockup" size="sm" />}
          logoCollapsed={<OpenEduLogo variant="symbol" size="sm" />}
          items={navItems}
          currentItemId={currentNavId}
          onNavigate={handleNavAction}
          sections={[section]}
          onBack={{ label: 'Back to Catalog', onClick: handleBackToCatalog }}
        />
      </div>
    );
  }

  return (
    <CompanionProvider>
      <RuntimeThemeProvider themeId={themeId}>
        <FontSizeProvider>
          <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
            {isCourseView && coursePkg ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <TopAppBar
                  breadcrumbs={getBreadcrumbs()}
                  isCourseView
                  courseTitle={coursePkg.manifest.title}
                  showA11yControls
                  progressCurrent={courseProgressCurrent}
                  progressTotal={courseProgressTotal}
                />
                {breakTimer.isTriggered && (
                  <BreakNagBar
                    mode={breakTimer.mode}
                    onTakeBreak={handleTakeBreak}
                    onIgnore={breakTimer.dismiss}
                  />
                )}
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
                  <ContextBridgeWithCompanion />
                </CourseRuntime>
              </div>
            ) : (
              <AppLayout
                sidebar={
                  <div className="relative h-full overflow-hidden">
                    <AssemblyFlow
                      density="dense"
                      className="pointer-events-none absolute inset-0 opacity-[0.08]"
                      aria-hidden="true"
                    />
                    <AppSidebar
                      logo={<OpenEduLogo variant="lockup" size="sm" />}
                      logoCollapsed={<OpenEduLogo variant="symbol" size="sm" />}
                      items={navItems}
                      currentItemId={currentNavId}
                      onNavigate={handleNavAction}
                    />
                  </div>
                }
                topBar={<TopAppBar breadcrumbs={getBreadcrumbs()} showA11yControls />}
              >
                {breakTimer.isTriggered && view.view !== 'break' && (
                  <BreakNagBar
                    mode={breakTimer.mode}
                    onTakeBreak={handleTakeBreak}
                    onIgnore={breakTimer.dismiss}
                  />
                )}
                <main className="bg-surface flex-1 overflow-y-auto" data-testid="app-main">
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
                    <SettingsPage
                      currentThemeId={themeId}
                      onThemeChange={setThemeId}
                      breakTimer={{
                        mode: breakTimer.mode,
                        setMode: breakTimer.setMode,
                      }}
                    />
                  )}
                  {view.view === 'collection' && <CollectionBinderPage packages={packageEntries} />}
                  {view.view === 'break' && <BreakPage onBackToLearning={handleBackToLearning} />}
                </main>
              </AppLayout>
            )}
            <CompanionFloatingUI view={view} />
            <CourseExitWarningDialog
              open={showExitWarning}
              onStay={handleExitStay}
              onLeave={handleExitLeave}
            />
          </div>
        </FontSizeProvider>
      </RuntimeThemeProvider>
    </CompanionProvider>
  );
}

function ContextBridgeWithCompanion(): JSX.Element | null {
  const { contextManager } = useCompanion();
  return <ContextBridge contextManager={contextManager} />;
}

function CompanionFloatingUI({ view }: { view: AppView }): JSX.Element {
  const { panelState, setPanelState, messages } = useCompanion();
  const isOpen = panelState !== 'closed';

  const mood =
    view.view === 'home' ? 'idle' : view.view === 'catalog' ? 'curious' : 'content';

  return (
    <>
      <Pipili
        mood={mood}
        visible
        hasUnread={messages.length > 0 && !isOpen}
        onClick={() => setPanelState(isOpen ? 'closed' : 'floating')}
      />
      <CompanionPanel />
    </>
  );
}
