import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { RuntimeThemeProvider, FontLoader, TopAppBar, useThemePreference } from '@open-edu/runtime';
import type { LoadedPackage, PackageSummary } from '@open-edu/core';
import { LeftNav, type AppView } from './LeftNav';
import { CourseRuntime } from './CourseRuntime';
import { HomePage } from './HomePage';
import { CatalogPage } from './CatalogPage';
import { ProgressDashboard } from './ProgressDashboard';
import { SettingsPage } from './SettingsPage';
import { CourseExitWarningDialog } from './CourseExitWarningDialog';

export interface AppShellProps {
  catalogPackages: PackageSummary[];
  packageEntries: Record<string, LoadedPackage>;
}

export function AppShell({ catalogPackages, packageEntries }: AppShellProps): JSX.Element {
  const [view, setView] = useState<AppView>({
    view: 'home',
  });
  const [themeId, setThemeId] = useThemePreference();
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [courseProgressCurrent, setCourseProgressCurrent] = useState(0);
  const [courseProgressTotal, setCourseProgressTotal] = useState(0);
  const pendingNavigation = useRef<AppView | null>(null);

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
    };

    const handlePopState = () => {
      pendingNavigation.current = { view: 'home' };
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
        if (newView.packageId && packageEntries[newView.packageId]) {
          setView({ view: 'course', packageId: newView.packageId });
        }
        return;
      }
      if (isCourseInProgress) {
        pendingNavigation.current = newView;
        setShowExitWarning(true);
      } else {
        setView(newView);
      }
    },
    [packageEntries, isCourseInProgress],
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

  const handleBackToCatalog = useCallback(() => {
    setView({ view: 'catalog' });
  }, []);

  const coursePkg = useMemo<LoadedPackage | undefined>(() => {
    if (view.view !== 'course' || !view.packageId) return undefined;
    return packageEntries[view.packageId];
  }, [view, packageEntries]);

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
      case 'course':
        return [{ label: coursePkg?.manifest.title ?? 'Course' }];
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
                  <CatalogPage packages={catalogPackages} onStartCourse={handleStartCourse} />
                )}
                {view.view === 'home' && (
                  <HomePage onNavigate={handleNavigate} catalogPackages={catalogPackages} />
                )}
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
