import { useState } from 'react';
import { RuntimeThemeProvider, FontLoader, useThemePreference } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { CatalogPage } from './CatalogPage';
import { CourseHomePage } from './CourseHomePage';
import { LessonPage } from './LessonPage';
import { AssessmentPage } from './AssessmentPage';
import { CodePage } from './CodePage';
import { ProgressPage } from './ProgressPage';

import { catalogPackages, packageEntries } from 'virtual:edu-data';

type Page =
  | { type: 'catalog' }
  | { type: 'course-home'; pkg: LoadedPackage }
  | { type: 'lesson'; pkg: LoadedPackage; nodeId: string }
  | { type: 'assessment'; pkg: LoadedPackage; nodeId: string }
  | { type: 'code'; pkg: LoadedPackage; nodeId: string }
  | { type: 'progress'; pkg: LoadedPackage };

export function App(): JSX.Element {
  const [page, setPage] = useState<Page>({ type: 'catalog' });
  const [themeId] = useThemePreference();

  const handleStartCourse = (packageDir: string) => {
    const pkg = Object.values(packageEntries).find((p) => p.rootDir === packageDir);
    if (pkg) {
      setPage({ type: 'course-home', pkg });
    }
  };

  const handleNavigate = (target: string, nodeId?: string) => {
    if (page.type === 'catalog') return;
    const pkg = page.type === 'course-home' || page.type === 'progress' ? page.pkg : page.pkg;

    switch (target) {
      case 'course-home':
        setPage({ type: 'course-home', pkg });
        break;
      case 'lesson':
        if (nodeId) setPage({ type: 'lesson', pkg, nodeId });
        break;
      case 'assessment':
        if (nodeId) setPage({ type: 'assessment', pkg, nodeId });
        break;
      case 'code':
        if (nodeId) setPage({ type: 'code', pkg, nodeId });
        break;
      case 'progress':
        setPage({ type: 'progress', pkg });
        break;
      default:
        setPage({ type: 'course-home', pkg });
    }
  };

  return (
    <RuntimeThemeProvider themeId={themeId}>
      <FontLoader />
      {page.type === 'catalog' && (
        <CatalogPage packages={catalogPackages} onStartCourse={handleStartCourse} />
      )}
      {page.type === 'course-home' && <CourseHomePage pkg={page.pkg} onNavigate={handleNavigate} />}
      {page.type === 'lesson' && (
        <LessonPage pkg={page.pkg} nodeId={page.nodeId} onNavigate={handleNavigate} />
      )}
      {page.type === 'assessment' && (
        <AssessmentPage pkg={page.pkg} nodeId={page.nodeId} onNavigate={handleNavigate} />
      )}
      {page.type === 'code' && (
        <CodePage pkg={page.pkg} nodeId={page.nodeId} onNavigate={handleNavigate} />
      )}
      {page.type === 'progress' && <ProgressPage pkg={page.pkg} onNavigate={handleNavigate} />}
    </RuntimeThemeProvider>
  );
}
