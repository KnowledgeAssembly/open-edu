import { useState, useCallback, useMemo } from 'react';
import { RuntimeThemeProvider, FontLoader, TopAppBar, useThemePreference } from '@open-edu/runtime';
import type { LoadedPackage, PackageSummary } from '@open-edu/core';
import { LeftNav, type AppView } from './LeftNav';
import { CourseRuntime } from './CourseRuntime';
import { HomePage } from './HomePage';
import { CatalogPage } from './CatalogPage';
import { ProgressDashboard } from './ProgressDashboard';
import { SettingsPage } from './SettingsPage';

export interface AppShellProps {
  catalogPackages: PackageSummary[];
  packageEntries: Record<string, LoadedPackage>;
}

export function AppShell({ catalogPackages, packageEntries }: AppShellProps): JSX.Element {
  const [view, setView] = useState<AppView | { view: 'course'; packageId: string }>({
    view: 'home',
  });
  const [themeId, setThemeId] = useThemePreference();

  const handleNavigate = useCallback(
    (newView: AppView) => {
      if (newView.view === 'course' && newView.packageId && packageEntries[newView.packageId]) {
        setView({ view: 'course', packageId: newView.packageId });
      } else if (newView.view === 'course') {
        return;
      } else {
        setView(newView);
      }
    },
    [packageEntries],
  );

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
    if (view.view !== 'course') return undefined;
    return packageEntries[(view as { view: 'course'; packageId: string }).packageId];
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
          <CourseRuntime pkg={coursePkg} onBackToCatalog={handleBackToCatalog}>
            <LeftNav
              currentView={view}
              onNavigate={handleNavigate}
              onBackToCatalog={handleBackToCatalog}
            />
          </CourseRuntime>
        ) : (
          <>
            <LeftNav currentView={view} onNavigate={handleNavigate} />
            <div className="flex-1 flex flex-col min-w-0">
              <TopAppBar
                breadcrumbs={getBreadcrumbs()}
                currentThemeId={themeId}
                onThemeChange={setThemeId}
                showA11yControls
              />
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
      </div>
    </RuntimeThemeProvider>
  );
}
