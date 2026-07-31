import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useBlocker } from 'react-router-dom';
import {
  RuntimeThemeProvider,
  TopAppBar,
  useThemePreference,
  useRuntimeOptional,
  type ThemeId,
} from '@open-edu/runtime';
import { I18nProvider, useTranslation } from '@open-edu/i18n';
import { dictionaries } from './i18n-dictionaries';
import type { LoadedPackage, PackageSummary, LoadedBundle, BundleSummary } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';
import { getOrderedNodes } from '@open-edu/workflow';
import { Home, TrendingUp, BookOpen, Settings, Library, StickyNote } from 'lucide-react';
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
import { ResetConfirmDialog } from './ResetConfirmDialog';
import { resetCourse } from './resetCourseStorage';
import { resetBundle } from './resetBundleStorage';
import { BundleOverviewPage } from './BundleOverviewPage';
import { CollectionBinderPage } from './CollectionBinderPage';
import { NotesDashboardPage } from './notes/NotesDashboardPage';
import { NoteEditorPage } from './notes/NoteEditorPage';
import { CatalogInstallView } from './components/CatalogInstallView';
import { Pipili } from './components/Pipili';
import { OfflineBanner } from './components/OfflineBanner.js';
import { CourseRightSidebar } from './CourseRightSidebar';
import { UpdatePrompt } from './components/UpdatePrompt.js';
import { useOnlineStatus } from './hooks/useOnlineStatus.js';
import { useUpdatePrompt } from './hooks/useUpdatePrompt.js';
import { useInstalledCourses } from './hooks/useInstalledCourses.js';
import {
  CompanionProvider,
  useCompanion,
  ContextBridge,
  TextSelectionToolbar,
  WordTapHandler,
  PipiliChatProvider,
  ReaderToolbar,
  useCompanionShortcut,
} from './ai';
import { getBundleProgress } from './bundleProgressStorage';
import { useBreakTimer } from './useBreakTimer';
import { BreakNagBar } from './BreakNagBar';
import { BreakPage } from './BreakPage';
import { loadLocaleFonts } from './i18n-fonts';
import { useThemeColorMeta } from './hooks/useThemeColorMeta';
import { useResizablePanel } from './hooks/useResizablePanel';
import {
  storedCourseToPackageSummary,
  storedCourseToLoadedPackage,
  storedBundleToLoadedBundle,
  countBadgeRewards,
} from './oepAdapters';

export type AppView =
  | { view: 'home' }
  | { view: 'catalog' }
  | { view: 'progress' }
  | { view: 'settings' }
  | { view: 'course'; packageId: string; bundleId?: string; moduleId?: string }
  | { view: 'bundleOverview'; bundleId: string }
  | { view: 'collection' }
  | { view: 'notes' }
  | { view: 'note-editor'; noteId: string }
  | { view: 'break' }
  | { view: 'catalog-install' };

function viewToPath(view: AppView): string {
  switch (view.view) {
    case 'home':
      return '/';
    case 'catalog':
      return '/catalog';
    case 'catalog-install':
      return '/catalog/install';
    case 'progress':
      return '/progress';
    case 'settings':
      return '/settings';
    case 'collection':
      return '/collection';
    case 'notes':
      return '/notes';
    case 'note-editor':
      return `/notes/${view.noteId}`;
    case 'break':
      return '/break';
    case 'bundleOverview':
      return `/bundle/${view.bundleId}`;
    case 'course': {
      if (view.bundleId && view.moduleId) {
        if (view.packageId === view.moduleId) {
          return `/course/${view.bundleId}/${view.moduleId}`;
        }
        return `/course/${view.packageId}/${view.bundleId}/${view.moduleId}`;
      }
      return `/course/${view.packageId}`;
    }
  }
}

function pathToView(
  pathname: string,
  packageEntries: Record<string, LoadedPackage>,
  bundleEntries?: Record<string, LoadedBundle>,
): AppView {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return { view: 'home' };
  const main = segments[0];
  if (!main) return { view: 'home' };
  if (main === 'catalog') {
    if (segments[1] === 'install') return { view: 'catalog-install' };
    return { view: 'catalog' };
  }
  if (main === 'progress') return { view: 'progress' };
  if (main === 'settings') return { view: 'settings' };
  if (main === 'collection') return { view: 'collection' };
  if (main === 'notes') {
    if (segments.length > 1) {
      return { view: 'note-editor', noteId: segments[1]! };
    }
    return { view: 'notes' };
  }
  if (main === 'break') return { view: 'break' };
  if (main === 'bundle' && segments[1]) return { view: 'bundleOverview', bundleId: segments[1] };
  if (main === 'course' && segments[1]) {
    if (packageEntries[segments[1]]) {
      return {
        view: 'course',
        packageId: segments[1],
        bundleId: segments[2],
        moduleId: segments[3],
      };
    }
    if (segments[1] && segments[2] && bundleEntries?.[segments[1]]) {
      return {
        view: 'course',
        packageId: segments[2],
        bundleId: segments[1],
        moduleId: segments[2],
      };
    }
    return { view: 'home' };
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
  const [themeId, setThemeId] = useThemePreference();

  return (
    <CompanionProvider>
      <PipiliChatProvider>
        <RuntimeThemeProvider themeId={themeId}>
          <I18nProvider
            locale="en"
            supportedLocales={['en', 'hi', 'or']}
            dictionaries={dictionaries}
          >
            <FontSizeProvider>
              <AppShellInner
                catalogPackages={catalogPackages}
                packageEntries={packageEntries}
                catalogBundles={catalogBundles}
                bundleEntries={bundleEntries}
                themeId={themeId}
                onThemeChange={setThemeId}
              />
            </FontSizeProvider>
          </I18nProvider>
        </RuntimeThemeProvider>
      </PipiliChatProvider>
    </CompanionProvider>
  );
}

interface AppShellInnerProps {
  catalogPackages: PackageSummary[];
  packageEntries: Record<string, LoadedPackage>;
  catalogBundles: BundleSummary[];
  bundleEntries: Record<string, LoadedBundle>;
  themeId: ThemeId;
  onThemeChange: (id: ThemeId) => void;
}

function AppShellInner({
  catalogPackages,
  packageEntries,
  catalogBundles,
  bundleEntries,
  themeId,
  onThemeChange,
}: AppShellInnerProps): JSX.Element {
  const { t, locale } = useTranslation();

  useEffect(() => {
    void loadLocaleFonts(locale);
  }, [locale]);

  useThemeColorMeta(themeId);

  const navigate = useNavigate();
  const location = useLocation();
  const courseContentRef = useRef<HTMLDivElement>(null);

  const { panelState, setPanelState, messages } = useCompanion();

  useCompanionShortcut(() => {
    setPanelState(panelState === 'closed' ? 'floating' : 'closed');
  });

  const { installedCourses, installedBundles, refresh: refreshInstalled } = useInstalledCourses();

  useEffect(() => {
    void refreshInstalled();
  }, [refreshInstalled]);

  const oepPackageEntries = useMemo(() => {
    const entries: Record<string, LoadedPackage> = {};
    for (const course of installedCourses) {
      if (!packageEntries[course.id]) {
        entries[course.id] = storedCourseToLoadedPackage(course);
      }
    }
    return entries;
  }, [installedCourses, packageEntries]);

  const allPackageEntries = useMemo(
    () => ({ ...packageEntries, ...oepPackageEntries }),
    [packageEntries, oepPackageEntries],
  );

  const oepCatalogPackages = useMemo(() => {
    return installedCourses.filter((c) => !packageEntries[c.id]).map(storedCourseToPackageSummary);
  }, [installedCourses, packageEntries]);

  const allCatalogPackages = useMemo(
    () => [...catalogPackages, ...oepCatalogPackages],
    [catalogPackages, oepCatalogPackages],
  );

  const oepBundleEntries = useMemo(() => {
    const entries: Record<string, LoadedBundle> = {};
    for (const bundle of installedBundles) {
      if (!bundleEntries[bundle.id]) {
        entries[bundle.id] = storedBundleToLoadedBundle(bundle);
      }
    }
    return entries;
  }, [installedBundles, bundleEntries]);

  const allBundleEntries = useMemo(
    () => ({ ...bundleEntries, ...oepBundleEntries }),
    [bundleEntries, oepBundleEntries],
  );

  const bundleModuleEntries = useMemo(() => {
    const entries: Record<string, LoadedPackage> = {};
    for (const bundle of Object.values(allBundleEntries)) {
      for (const mod of bundle.modules) {
        if (!packageEntries[mod.manifest.id]) {
          entries[mod.manifest.id] = mod;
        }
      }
    }
    return entries;
  }, [allBundleEntries, packageEntries]);

  const mergedPackageEntries = useMemo(
    () => ({ ...allPackageEntries, ...bundleModuleEntries }),
    [allPackageEntries, bundleModuleEntries],
  );

  const bundleModulePackages = useMemo<PackageSummary[]>(() => {
    return Object.values(bundleModuleEntries).map((mod) => ({
      manifest: mod.manifest,
      nodeCount: mod.nodes.length,
      availableBadges: countBadgeRewards(mod.rewards),
      rootDir: mod.rootDir,
    }));
  }, [bundleModuleEntries]);

  const moduleToBundleId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const bundle of Object.values(allBundleEntries)) {
      for (const mod of bundle.modules) {
        map[mod.manifest.id] = bundle.manifest.id;
      }
    }
    return map;
  }, [allBundleEntries]);

  const bundleCards = useMemo(
    () => Object.values(allBundleEntries).flatMap((b) => b.cards?.cards ?? []),
    [allBundleEntries],
  );

  const view = useMemo<AppView>(
    () => pathToView(location.pathname, mergedPackageEntries, allBundleEntries),
    [location.pathname, mergedPackageEntries, allBundleEntries],
  );

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const [bundleProgress, setBundleProgress] = useState<Record<string, BundleProgressSnapshot>>({});

  const [resetTarget, setResetTarget] = useState<{
    id: string;
    title: string;
    isBundle: boolean;
  } | null>(null);
  const [resetCounter, setResetCounter] = useState(0);

  const initialSidebarWidth = useMemo(() => {
    try {
      const saved = localStorage.getItem('oe-right-sidebar-width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed >= 280 && parsed <= 600) return parsed;
      }
    } catch {
      // localStorage may not be available
    }
    return 320;
  }, []);

  const handleWidthChange = useCallback((width: number) => {
    try {
      localStorage.setItem('oe-right-sidebar-width', String(width));
    } catch {
      // localStorage may not be available
    }
  }, []);

  const {
    width: sidebarWidth,
    isDragging: isResizing,
    handleProps: resizeHandleProps,
  } = useResizablePanel({
    initialWidth: initialSidebarWidth,
    minWidth: 280,
    maxWidth: 600,
    ariaLabel: t('learner.right_sidebar.resize_handle'),
    onWidthChange: handleWidthChange,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const progress: Record<string, BundleProgressSnapshot> = {};
      for (const bundleId of Object.keys(bundleEntries)) {
        const saved = await getBundleProgress(bundleId);
        if (saved) progress[bundleId] = saved;
      }
      if (!cancelled) setBundleProgress((prev) => ({ ...progress, ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [bundleEntries]);

  const isCourseInProgress = useMemo(() => {
    if (view.view !== 'course' || !view.packageId) return false;
    const pkg = mergedPackageEntries[view.packageId];
    if (!pkg) return false;
    return true;
  }, [view, mergedPackageEntries]);

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
      if (newView.view === 'course' && newView.packageId) {
        if (!mergedPackageEntries[newView.packageId]) return;
        const bundleId = newView.bundleId ?? moduleToBundleId[newView.packageId];
        if (bundleId && !newView.bundleId) {
          navigate(
            viewToPath({
              view: 'course',
              packageId: newView.packageId,
              bundleId,
              moduleId: newView.packageId,
            }),
          );
          return;
        }
      }
      navigate(viewToPath(newView));
    },
    [mergedPackageEntries, moduleToBundleId, navigate],
  );

  const handleExitStay = useCallback(() => {
    blocker.reset?.();
  }, [blocker]);

  const handleExitLeave = useCallback(() => {
    blocker.proceed?.();
  }, [blocker]);

  const handleStartCourse = useCallback(
    (packageDir: string) => {
      const pkg = Object.values(mergedPackageEntries).find((p) => p.rootDir === packageDir);
      if (pkg) {
        const bundleId = moduleToBundleId[pkg.manifest.id];
        if (bundleId) {
          navigate(`/course/${bundleId}/${pkg.manifest.id}`);
        } else {
          navigate(`/course/${pkg.manifest.id}`);
        }
      }
    },
    [mergedPackageEntries, moduleToBundleId, navigate],
  );

  const handleStartBundle = useCallback(
    (bundleId: string) => {
      navigate(`/bundle/${bundleId}`);
    },
    [navigate],
  );

  const handleStartBundleModule = useCallback(
    (bundleId: string, moduleId: string) => {
      navigate(`/course/${bundleId}/${moduleId}`);
    },
    [navigate],
  );

  const handleBackToCatalog = useCallback(() => {
    if (view.view === 'course' && view.bundleId) {
      navigate(`/bundle/${view.bundleId}`);
      return;
    }
    navigate('/catalog');
  }, [view, navigate]);

  const handleRequestReset = useCallback((id: string, title: string, isBundle: boolean) => {
    setResetTarget({ id, title, isBundle });
  }, []);

  const handleResetConfirm = useCallback(async () => {
    if (!resetTarget) return;
    try {
      if (resetTarget.isBundle) {
        const bundle = allBundleEntries[resetTarget.id];
        if (bundle) await resetBundle(bundle);
      } else {
        await resetCourse(resetTarget.id);
      }
    } catch (e) {
      console.warn('[AppShell] Reset failed:', e);
    }
    setResetTarget(null);
    setBundleProgress({});
    setResetCounter((c) => c + 1);
  }, [resetTarget, bundleEntries]);

  const handleResetCancel = useCallback(() => {
    setResetTarget(null);
  }, []);

  const coursePkg = useMemo<LoadedPackage | undefined>(() => {
    if (view.view !== 'course' || !view.packageId) return undefined;
    return mergedPackageEntries[view.packageId];
  }, [view, mergedPackageEntries]);

  const courseBundle = useMemo<LoadedBundle | undefined>(() => {
    if (view.view !== 'course' || !view.bundleId) return undefined;
    return allBundleEntries[view.bundleId];
  }, [view, allBundleEntries]);

  const bundleContextMemo = useMemo(() => {
    if (!courseBundle) return undefined;
    return {
      bundleId: courseBundle.manifest.id,
      bundle: courseBundle,
      currentBundleProgress: bundleProgress[courseBundle.manifest.id] ?? null,
      onBundleSnapshot: (snapshot: BundleProgressSnapshot) => {
        setBundleProgress((prev) => ({
          ...prev,
          [courseBundle.manifest.id]: snapshot,
        }));
      },
    };
  }, [courseBundle, bundleProgress]);

  const isOnline = useOnlineStatus();
  const updatePrompt = useUpdatePrompt();

  const handleProgressUpdate = useCallback((current: number, total: number) => {
    setCourseProgressCurrent(current);
    setCourseProgressTotal(total);
  }, []);

  const getBreadcrumbs = () => {
    switch (view.view) {
      case 'home':
        return [{ label: t('learner.breadcrumb.home') }];
      case 'catalog':
        return [{ label: t('learner.breadcrumb.course_catalog') }];
      case 'progress':
        return [{ label: t('learner.breadcrumb.my_progress') }];
      case 'settings':
        return [{ label: t('learner.breadcrumb.settings') }];
      case 'bundleOverview': {
        const bundle = allBundleEntries[view.bundleId];
        return [
          { label: t('learner.breadcrumb.course_catalog') },
          { label: bundle?.manifest.title ?? t('learner.fallback.bundle') },
        ];
      }
      case 'break':
        return [{ label: t('learner.breadcrumb.break') }];
      case 'course': {
        const breadcrumbs = [{ label: coursePkg?.manifest.title ?? t('learner.fallback.course') }];
        if (view.bundleId) {
          const bundle = allBundleEntries[view.bundleId];
          if (bundle) {
            breadcrumbs.unshift({ label: bundle.manifest.title });
          }
        }
        return breadcrumbs;
      }
      default:
        return [{ label: t('learner.breadcrumb.home') }];
    }
  };

  const isCourseView = view.view === 'course';

  const navItems: AppSidebarItem[] = [
    { id: 'home', label: t('learner.nav.home'), icon: <Home className="h-5 w-5" /> },
    { id: 'progress', label: t('learner.nav.progress'), icon: <TrendingUp className="h-5 w-5" /> },
    { id: 'notes', label: t('learner.nav.notes'), icon: <StickyNote className="h-5 w-5" /> },
    { id: 'collection', label: t('learner.nav.collection'), icon: <Library className="h-5 w-5" /> },
    { id: 'catalog', label: t('learner.nav.catalog'), icon: <BookOpen className="h-5 w-5" /> },
    { id: 'settings', label: t('learner.nav.settings'), icon: <Settings className="h-5 w-5" /> },
  ];

  const currentNavId =
    view.view === 'bundleOverview'
      ? 'catalog'
      : view.view === 'collection'
        ? 'collection'
        : view.view === 'notes' || view.view === 'note-editor'
          ? 'notes'
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
        case 'notes':
          handleNavigate({ view: 'notes' });
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

    const section: AppSidebarSection = { title: t('learner.sidebar.course_steps'), items };
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
          onBack={{ label: t('learner.back_to_catalog'), onClick: handleBackToCatalog }}
          collapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">
      <OfflineBanner isOnline={isOnline} />
      <div className="flex min-w-0 flex-1">
        {isCourseView && coursePkg ? (
          <WordTapHandler className="flex min-w-0 flex-1 flex-col">
            <div
              key={`${location.pathname}-${resetCounter}`}
              ref={courseContentRef}
              className="animate-in fade-in flex min-h-0 min-w-0 flex-1 flex-row duration-500"
              data-content-area="true"
            >
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
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
                  sidebarCollapsed={sidebarCollapsed}
                  onProgressUpdate={handleProgressUpdate}
                  header={
                    <>
                      <TopAppBar
                        breadcrumbs={getBreadcrumbs()}
                        isCourseView
                        courseTitle={coursePkg.manifest.title}
                        showA11yControls
                        progressCurrent={courseProgressCurrent}
                        progressTotal={courseProgressTotal}
                      />
                      <ReaderToolbar
                        onOpen={() =>
                          setPanelState(panelState === 'closed' ? 'floating' : 'closed')
                        }
                        hasUnread={messages.length > 0 && panelState === 'closed'}
                      />
                    </>
                  }
                  bundleContext={bundleContextMemo}
                >
                  <CourseStepWrapper />
                  <ContextBridgeWithCompanion />
                </CourseRuntime>
                <TextSelectionToolbar containerRef={courseContentRef} />
              </div>
            </div>
          </WordTapHandler>
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
          >
            {breakTimer.isTriggered && view.view !== 'break' && (
              <BreakNagBar
                mode={breakTimer.mode}
                onTakeBreak={handleTakeBreak}
                onIgnore={breakTimer.dismiss}
              />
            )}
            <div className="bg-surface flex h-full w-full flex-col" data-testid="app-main">
              <div className="shrink-0">
                <TopAppBar breadcrumbs={getBreadcrumbs()} showA11yControls />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  key={`${location.pathname}-${resetCounter}`}
                  className="animate-in fade-in slide-in-from-bottom-4 flex min-h-0 flex-1 flex-col overflow-y-auto duration-500"
                >
                  {view.view === 'catalog-install' && <CatalogInstallView />}
                  {view.view === 'catalog' && (
                    <CatalogPage
                      packages={allCatalogPackages}
                      bundleSummaries={catalogBundles}
                      bundleProgress={bundleProgress}
                      modulePackages={bundleModulePackages}
                      onStartCourse={handleStartCourse}
                      onStartBundle={handleStartBundle}
                      onNavigate={handleNavigate}
                      onRequestReset={handleRequestReset}
                      installedCourses={installedCourses}
                      installedBundles={installedBundles}
                      onRefreshInstalled={refreshInstalled}
                      onRemoveInstalled={refreshInstalled}
                    />
                  )}
                  {view.view === 'home' && (
                    <HomePage
                      onNavigate={handleNavigate}
                      catalogPackages={allCatalogPackages}
                      bundleEntries={bundleEntries}
                    />
                  )}
                  {(() => {
                    if (view.view !== 'bundleOverview' || !view.bundleId) return null;
                    const bundle = allBundleEntries[view.bundleId];
                    if (!bundle) return null;
                    return (
                      <BundleOverviewPage
                        bundle={bundle}
                        bundleProgress={bundleProgress[view.bundleId] ?? null}
                        onStartModule={handleStartBundleModule}
                        onBackToCatalog={handleBackToCatalog}
                        onRequestReset={handleRequestReset}
                      />
                    );
                  })()}
                  {view.view === 'progress' && (
                    <ProgressDashboard
                      onNavigate={handleNavigate}
                      catalogPackages={allCatalogPackages}
                      packageEntries={mergedPackageEntries}
                      onRequestReset={handleRequestReset}
                    />
                  )}
                  {view.view === 'settings' && (
                    <SettingsPage
                      currentThemeId={themeId}
                      onThemeChange={onThemeChange}
                      breakTimer={{
                        mode: breakTimer.mode,
                        setMode: breakTimer.setMode,
                      }}
                    />
                  )}
                  {view.view === 'collection' && (
                    <CollectionBinderPage
                      packages={mergedPackageEntries}
                      bundleCards={bundleCards}
                    />
                  )}
                  {view.view === 'notes' && <NotesDashboardPage onNavigate={handleNavigate} />}
                  {view.view === 'note-editor' && view.noteId && (
                    <NoteEditorPage noteId={view.noteId} onNavigate={handleNavigate} />
                  )}
                  {view.view === 'break' && <BreakPage onBackToLearning={handleBackToLearning} />}
                </div>
              </div>
            </div>
          </AppLayout>
        )}
      </div>
      <div className="flex shrink-0">
        {panelState !== 'closed' && (
          <div
            className={`w-1.5 shrink-0 cursor-col-resize transition-colors ${
              isResizing ? 'bg-outline-variant' : 'hover:bg-outline-variant bg-transparent'
            }`}
            {...resizeHandleProps}
          />
        )}
        <CourseRightSidebar onNavigate={handleNavigate} width={sidebarWidth} />
      </div>
      <CompanionFloatingUI view={view} />
      <ResetConfirmDialog
        open={resetTarget !== null}
        isBundle={resetTarget?.isBundle ?? false}
        courseTitle={resetTarget?.title ?? ''}
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
      />
      <CourseExitWarningDialog
        open={showExitWarning}
        onStay={handleExitStay}
        onLeave={handleExitLeave}
      />
      <UpdatePrompt
        updateAvailable={updatePrompt.updateAvailable}
        onUpdate={updatePrompt.accept}
        onDismiss={updatePrompt.dismiss}
      />
    </div>
  );
}

function ContextBridgeWithCompanion(): JSX.Element | null {
  const { contextManager } = useCompanion();
  return <ContextBridge contextManager={contextManager} />;
}

function CompanionFloatingUI({ view }: { view: AppView }): JSX.Element | null {
  const { panelState, setPanelState, messages, pendingReward } = useCompanion();
  const isOpen = panelState !== 'closed';

  const isCourseView = view.view === 'course';
  const showRewardState = isCourseView && pendingReward;

  return (
    <Pipili
      mood={!isCourseView && isOpen ? 'curious' : 'idle'}
      visible={isCourseView ? !isOpen : true}
      hasUnread={messages.length > 0 && !isOpen}
      pendingReward={showRewardState}
      onClick={() => setPanelState(isOpen ? 'closed' : 'floating')}
    />
  );
}
