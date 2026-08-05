import { useCallback, useState } from 'react';
import { useTranslation } from '@open-edu/i18n';
import { HomeView } from './components/HomeView.js';
import { OutlineView } from './components/OutlineView.js';
import { ShareView } from './components/ShareView.js';
import { ActivityEditorRouter } from './components/ActivityEditorRouter.js';
import { StudioTopBar } from './components/StudioTopBar.js';
import { CreatorPreview } from './CreatorPreview.js';
import { createStudioApi } from './studioApi.js';
import { recordRecentCourse } from './recentCourses.js';
import {
  readStudioView,
  writeStudioView,
  readSelectedPath,
  writeSelectedPath,
} from './studioSession.js';
import type { LoadedPackage } from '@open-edu/core';
import type { StudioMode, StudioView } from './types.js';

export function StudioApp({
  mode,
  onModeChange,
  loadedPackage,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  loadedPackage: LoadedPackage | null;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<StudioView>(() => readStudioView());
  const [selectedPath, setSelectedPath] = useState<string | null>(() => readSelectedPath());
  const [courseTitle, setCourseTitle] = useState<string | undefined>(loadedPackage?.manifest.title);
  const [error, setError] = useState<string | null>(null);
  const api = createStudioApi();

  const handleNavigate = useCallback((next: StudioView) => {
    setView(next);
    writeStudioView(next);
  }, []);

  const handleOpened = useCallback(() => {
    if (loadedPackage) {
      recordRecentCourse({
        id: loadedPackage.manifest.id,
        title: loadedPackage.manifest.title,
        packageDir: loadedPackage.rootDir,
        updatedAt: Date.now(),
      });
    }
    handleNavigate('outline');
  }, [loadedPackage, handleNavigate]);

  const handleEdit = useCallback(
    (path: string) => {
      setSelectedPath(path);
      writeSelectedPath(path);
      handleNavigate('edit-activity');
    },
    [handleNavigate],
  );

  const handleError = useCallback((message: string) => {
    setError(message);
    window.setTimeout(() => setError(null), 4000);
  }, []);

  let content: React.ReactNode;
  switch (view) {
    case 'home':
      content = (
        <HomeView
          api={api}
          onOpened={handleOpened}
          onError={handleError}
          courseTitle={loadedPackage?.manifest.title}
          onOpenCurrent={() => handleNavigate('outline')}
        />
      );
      break;
    case 'outline':
      content = (
        <OutlineView
          api={api}
          onEdit={handleEdit}
          onError={handleError}
          onTitleChange={setCourseTitle}
        />
      );
      break;
    case 'edit-activity':
      content = selectedPath ? (
        <ActivityEditorRouter
          api={api}
          path={selectedPath}
          onSaved={() => {}}
          onError={handleError}
        />
      ) : null;
      break;
    case 'preview':
      content = loadedPackage ? (
        <CreatorPreview pkg={loadedPackage} />
      ) : (
        <p className="text-on-surface-variant p-6 text-sm">{t('studio.preview.noPackageLoaded')}</p>
      );
      break;
    case 'share':
      content = <ShareView api={api} onError={handleError} />;
      break;
  }

  return (
    <div className="flex h-screen flex-col">
      <StudioTopBar
        mode={mode}
        onModeChange={onModeChange}
        onNavigate={handleNavigate}
        courseTitle={courseTitle}
      />
      <main className="bg-surface min-h-0 flex-1 overflow-auto">
        {content}
        {error ? (
          <div className="text-error mx-auto mt-4 max-w-3xl px-6 text-sm" role="alert">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  );
}
