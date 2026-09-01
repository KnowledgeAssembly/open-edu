import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EmptyState } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import type { ThemeId } from '@open-edu/runtime';
import { HomeView } from './components/HomeView.js';
import { LibraryView } from './components/LibraryView.js';
import { OutlineWorkspace } from './components/OutlineWorkspace.js';
import { ShareView } from './components/ShareView.js';
import { UnitBuilderView } from './components/UnitBuilderView.js';
import { ActivityEditorRouter } from './components/ActivityEditorRouter.js';
import { StudioChrome } from './components/StudioChrome.js';
import { StudioLayout } from './components/StudioLayout.js';
import { CreatorPreview } from './CreatorPreview.js';
import { createLocalStudioApi } from './localStudioApi.js';
import type { StudioApi } from './studioApi.js';
import { recordRecentCourse } from './recentCourses.js';
import {
  readStudioView,
  writeStudioView,
  readSelectedPath,
  writeSelectedPath,
  writeOutlineTab,
  writeFilesPath,
} from './studioSession.js';
import type { LoadedPackage } from '@open-edu/core';
import type { StudioView } from './types.js';
import {
  StudioAssistantProvider,
  StudioChatProvider,
  StudioContextBridge,
  useStudioAssistant,
} from './ai';
import { migrateLegacyReview } from './ai/aiSession.js';
import { EditorBridgeProvider } from './ai/EditorBridgeContext';
import { isAssistantEnabled } from './ai/assistantFlags';
import { StudioRightSidebar } from './components/StudioRightSidebar.js';

import { getProfile } from '@open-edu/domain-guidance/profiles';
import type { LearnerProfile } from './ai/context.js';

export function StudioApp({
  loadedPackage,
  bundleUnsupported = false,
  _assistantEnabled,
  themeId,
  onThemeChange,
  api: apiProp,
  storageNotice,
  browserMode = false,
}: {
  loadedPackage: LoadedPackage | null;
  bundleUnsupported?: boolean;
  _assistantEnabled?: boolean;
  themeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
  api?: StudioApi;
  storageNotice?: string | null;
  browserMode?: boolean;
}) {
  const { t } = useTranslation();
  const [view, setView] = useState<StudioView>(() => readStudioView());
  const [selectedPath, setSelectedPath] = useState<string | null>(() => readSelectedPath());
  const [courseTitle, setCourseTitle] = useState<string | undefined>(loadedPackage?.manifest.title);
  const [error, setError] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [assistantEnabled] = useState(() => _assistantEnabled ?? isAssistantEnabled());
  const [outlineRevision, setOutlineRevision] = useState(0);
  const [targetLearnerKind, setTargetLearnerKind] = useState<string>(() => {
    return localStorage.getItem('openedu.studio.targetLearnerKind') || 'neurotypical';
  });

  const handleTargetLearnerKindChange = useCallback((kind: string) => {
    setTargetLearnerKind(kind);
    localStorage.setItem('openedu.studio.targetLearnerKind', kind);
  }, []);

  const learner: LearnerProfile = useMemo(() => {
    const profileDef = getProfile(targetLearnerKind) || getProfile('neurotypical')!;
    return {
      id: profileDef.id,
      label: profileDef.name,
      kind: profileDef.kind as any,
    };
  }, [targetLearnerKind]);

  const api = useMemo(() => apiProp ?? createLocalStudioApi(), [apiProp]);

  useEffect(() => {
    let cancelled = false;
    void api
      .getAiStatus()
      .then((status) => {
        if (!cancelled) setAiAvailable(status.available);
      })
      .catch(() => {
        if (!cancelled) setAiAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const handleNavigate = useCallback((next: StudioView) => {
    setView(next);
    writeStudioView(next);
    if (next === 'outline' || next === 'home') {
      setSelectedPath(null);
      writeSelectedPath(null);
    }
  }, []);

  const handleOpened = useCallback(() => {
    if (loadedPackage) {
      const isBrowser = loadedPackage.rootDir.startsWith('browser://');
      recordRecentCourse({
        id: loadedPackage.manifest.id,
        title: loadedPackage.manifest.title,
        location: isBrowser ? 'browser' : 'local',
        packageDir: isBrowser ? undefined : loadedPackage.rootDir,
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

  const handleOpenPath = useCallback(
    (path: string) => {
      if (path.startsWith('nodes/')) {
        handleEdit(path);
        return;
      }
      writeOutlineTab('files');
      writeFilesPath(path);
      handleNavigate('outline');
    },
    [handleEdit, handleNavigate],
  );

  const handleError = useCallback((message: string) => {
    setError(message);
    window.setTimeout(() => setError(null), 4000);
  }, []);

  if (bundleUnsupported) {
    return (
      <div className="flex h-screen flex-col">
        <StudioChrome
          minimal
          onNavigate={handleNavigate}
          view={view}
          themeId={themeId}
          onThemeChange={onThemeChange}
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
          onOpenLibrary={() => handleNavigate('library')}
        />
      );
      break;
    case 'outline':
      content = (
        <OutlineWorkspace
          key={outlineRevision}
          api={api}
          onEdit={handleEdit}
          onError={handleError}
          onTitleChange={setCourseTitle}
          onShare={() => handleNavigate('share')}
          onOutlineMutated={() => setOutlineRevision((n) => n + 1)}
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
    case 'library':
      content = (
        <LibraryView
          api={api}
          browserMode={browserMode}
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
    <StudioAssistantProvider>
      <EditorBridgeProvider>
        <StudioChatProvider
          courseId={loadedPackage?.manifest.id}
          api={api}
          onOpenPath={handleOpenPath}
          onError={handleError}
          onOutlineChanged={() => {
            setOutlineRevision((rev) => rev + 1);
            handleNavigate('outline');
          }}
        >
          <StudioContextBridge
            view={view}
            selectedPath={selectedPath}
            loadedPackage={loadedPackage}
            aiAvailable={aiAvailable}
            locale="en"
            learner={learner}
            api={api}
          />
          <StudioAppInner
            handleNavigate={handleNavigate}
            courseTitle={courseTitle}
            view={view}
            selectedPath={selectedPath}
            assistantEnabled={assistantEnabled}
            themeId={themeId}
            onThemeChange={onThemeChange}
            targetLearnerKind={targetLearnerKind}
            onTargetLearnerKindChange={handleTargetLearnerKindChange}
          >
            <div key={view} className="studio-view-enter min-h-0 flex-1">
              {storageNotice ? (
                <div
                  className="border-outline-variant bg-surface-container-highest text-on-surface-variant mx-auto mt-4 max-w-3xl rounded-lg border px-4 py-2 text-sm"
                  role="status"
                >
                  {storageNotice}
                </div>
              ) : null}
              {content}
              {error ? (
                <div className="text-error mx-auto mt-4 max-w-3xl px-6 text-sm" role="alert">
                  {error}
                </div>
              ) : null}
            </div>
          </StudioAppInner>
        </StudioChatProvider>
      </EditorBridgeProvider>
    </StudioAssistantProvider>
  );
}

function StudioAppInner({
  handleNavigate,
  courseTitle,
  view,
  selectedPath,
  assistantEnabled,
  themeId,
  onThemeChange,
  targetLearnerKind,
  onTargetLearnerKindChange,
  children,
}: {
  handleNavigate: (view: StudioView) => void;
  courseTitle?: string;
  view: StudioView;
  selectedPath?: string | null;
  assistantEnabled?: boolean;
  themeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
  targetLearnerKind?: string;
  onTargetLearnerKindChange?: (kind: string) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { panelOpen, setPanelOpen, openWithPreset } = useStudioAssistant();

  useEffect(() => {
    if (!assistantEnabled) return;
    const legacy = migrateLegacyReview();
    if (!legacy) return;
    // Legacy reviews were already written to disk — no draftId to recover.
    openWithPreset({ message: t('studio.assistant.courseDraft.legacyExpired') });
  }, [assistantEnabled, openWithPreset, t]);

  return (
    <div className="flex h-screen flex-col">
      <StudioChrome
        onNavigate={handleNavigate}
        courseTitle={courseTitle}
        view={view}
        activityLabel={selectedPath?.split('/').pop()}
        panelOpen={panelOpen}
        setPanelOpen={assistantEnabled ? setPanelOpen : undefined}
        themeId={themeId}
        onThemeChange={onThemeChange}
        targetLearnerKind={targetLearnerKind}
        onTargetLearnerKindChange={onTargetLearnerKindChange}
      />
      <StudioLayout
        className="bg-surface min-h-0 flex-1 overflow-hidden"
        sidebar={assistantEnabled ? <StudioRightSidebar /> : undefined}
      >
        {children}
      </StudioLayout>
    </div>
  );
}
