import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { HomeView } from './components/HomeView.js';
import { LibraryView } from './components/LibraryView.js';
import { OutlineView } from './components/OutlineView.js';
import { ShareView } from './components/ShareView.js';
import { UnitBuilderView } from './components/UnitBuilderView.js';
import { AiReviewView } from './components/AiReviewView.js';
import { ActivityEditorRouter } from './components/ActivityEditorRouter.js';
import { StudioChrome } from './components/StudioChrome.js';
import { CreatorPreview } from './CreatorPreview.js';
import { createStudioApi } from './studioApi.js';
import { recordRecentCourse } from './recentCourses.js';
import { writeAiReview, readAiReview, clearAiReview } from './ai/aiSession.js';
import {
  readStudioView,
  writeStudioView,
  readSelectedPath,
  writeSelectedPath,
} from './studioSession.js';
import type { LoadedPackage } from '@open-edu/core';
import type { AiGenerateResult } from './ai/types.js';
import type { DraftItem } from './ai/types.js';
import type { StudioMode, StudioView } from './types.js';

export function StudioApp({
  mode,
  onModeChange,
  loadedPackage,
  bundleUnsupported = false,
}: {
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  loadedPackage: LoadedPackage | null;
  /** When true, Creator is open against a bundle — no package mutations. */
  bundleUnsupported?: boolean;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<StudioView>(() => readStudioView());
  const [selectedPath, setSelectedPath] = useState<string | null>(() => readSelectedPath());
  const [courseTitle, setCourseTitle] = useState<string | undefined>(loadedPackage?.manifest.title);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiGenerateResult | null>(() => readAiReview());
  const api = useMemo(() => createStudioApi(), []);

  const handleNavigate = useCallback((next: StudioView) => {
    setView(next);
    writeStudioView(next);
    if (next === 'outline' || next === 'home') {
      setSelectedPath(null);
      writeSelectedPath(null);
    }
  }, []);

  const handleAiGenerated = useCallback(
    (result: AiGenerateResult) => {
      writeAiReview(result);
      setAiResult(result);
      handleNavigate('ai-review');
    },
    [handleNavigate],
  );

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

  const handleSaveDraftItems = useCallback(
    (items: DraftItem[]) => {
      void (async () => {
        const stamp = Date.now();
        const written: string[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i]!;
          const ext = item.kind === 'lesson' ? '.md' : '.json';
          const path = `nodes/${item.kind}-${stamp + i}${ext}`;
          try {
            await api.writeFile(path, item.content);
            written.push(path);
          } catch (err) {
            handleError(
              `${err instanceof Error ? err.message : String(err)} (${written.length} of ${
                items.length
              } saved)`,
            );
            return;
          }
        }
        try {
          const outline = await api.getOutline();
          await api.saveOutlineOrder([
            ...outline.activities.map((activity) => activity.path),
            ...written,
          ]);
        } catch (err) {
          handleError(err instanceof Error ? err.message : t('studio.errors.generic'));
          return;
        }
        handleNavigate('outline');
      })();
    },
    [api, handleError, handleNavigate, t],
  );

  if (bundleUnsupported) {
    return (
      <div className="flex h-screen flex-col">
        <StudioChrome
          minimal
          mode={mode}
          onModeChange={onModeChange}
          onNavigate={handleNavigate}
          view={view}
        />
        <main className="bg-surface flex min-h-0 flex-1 items-center justify-center p-6">
          <EmptyState
            heading={t('studio.bundle.unsupportedHeading')}
            description={t('studio.bundle.unsupportedLede')}
          />
        </main>
      </div>
    );
  }

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
          onAiGenerated={handleAiGenerated}
          onOpenLibrary={() => handleNavigate('library')}
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
          onShare={() => handleNavigate('share')}
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
          onCancel={() => handleNavigate('outline')}
          onApplyBatch={handleSaveDraftItems}
        />
      ) : null;
      break;
    case 'preview':
      content = loadedPackage ? (
        <CreatorPreview pkg={loadedPackage} onExit={() => handleNavigate('outline')} />
      ) : (
        <p className="text-on-surface-variant p-6 text-sm">{t('studio.preview.noPackageLoaded')}</p>
      );
      break;
    case 'share':
      content = <ShareView api={api} onError={handleError} />;
      break;
    case 'ai-review':
      content = aiResult ? (
        <AiReviewView
          result={aiResult}
          onAccept={() => {
            void (async () => {
              const packageDir = await Promise.resolve(api.getPackageDir()).catch(() => '');
              clearAiReview();
              recordRecentCourse({
                id: aiResult.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'ai-course',
                title: aiResult.title || 'AI draft course',
                packageDir,
                updatedAt: Date.now(),
              });
              handleNavigate('outline');
            })();
          }}
          onReject={() => {
            clearAiReview();
            handleNavigate('home');
          }}
        />
      ) : (
        <EmptyState
          heading={t('studio.ai.reviewTitle')}
          description={t('studio.ai.errorGeneric')}
        />
      );
      break;
    case 'library':
      content = (
        <LibraryView
          api={api}
          onOpen={(relativePath) =>
            void (async () => {
              try {
                await api.openLibraryCourse(relativePath);
                handleNavigate('outline');
              } catch (err) {
                handleError(err instanceof Error ? err.message : t('studio.errors.generic'));
              }
            })()
          }
          onError={handleError}
          onCreateUnit={() => handleNavigate('unit-builder')}
        />
      );
      break;
    case 'unit-builder':
      content = (
        <UnitBuilderView
          api={api}
          onError={handleError}
          onCreated={() => handleNavigate('library')}
        />
      );
      break;
  }

  return (
    <div className="flex h-screen flex-col">
      <StudioChrome
        mode={mode}
        onModeChange={onModeChange}
        onNavigate={handleNavigate}
        courseTitle={courseTitle}
        view={view}
        activityLabel={selectedPath?.split('/').pop()}
      />
      <main className="bg-surface flex min-h-0 flex-1 flex-col overflow-auto">
        <div key={view} className="studio-view-enter min-h-0 flex-1">
          {content}
          {error ? (
            <div className="text-error mx-auto mt-4 max-w-3xl px-6 text-sm" role="alert">
              {error}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
