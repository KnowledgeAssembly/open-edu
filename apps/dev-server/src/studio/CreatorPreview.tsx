import { useCallback, useMemo, useState } from 'react';
import { RuntimeProvider, LayoutShell } from '@open-edu/runtime';
import { WorkflowEngine } from '@open-edu/workflow';
import { AccessibilityProvider } from '@open-edu/accessibility';
import { createDefaultRegistry } from '@open-edu/widgets';
import { Button } from '@open-edu/design-system';
import { useTranslation } from '@open-edu/i18n';
import { loadProgress, saveProgress, clearProgress } from '../progressStorage.js';
import type { ProgressSnapshot } from '@open-edu/schemas';
import type { LoadedPackage } from '@open-edu/core';

export function CreatorPreview({ pkg }: { pkg: LoadedPackage }): JSX.Element {
  const { t } = useTranslation();
  const [progressKey, setProgressKey] = useState(0);

  const initialProgress = useMemo(() => {
    return loadProgress(pkg.manifest.id, pkg.manifest.version) ?? undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressKey, pkg.manifest.id, pkg.manifest.version]);

  const engine = useMemo(() => {
    if (!pkg.workflow) return null;
    const saved = initialProgress?.currentNodeId;
    const entry = saved && saved in pkg.workflow.routing ? saved : pkg.manifest.entry;
    return new WorkflowEngine(pkg.workflow, { entry });
  }, [pkg, initialProgress, progressKey]);

  const widgetRegistry = useMemo(() => createDefaultRegistry(), []);

  const handleProgressChange = useCallback(
    (snapshot: ProgressSnapshot) => {
      saveProgress(pkg.manifest.id, pkg.manifest.version, snapshot);
    },
    [pkg.manifest.id, pkg.manifest.version],
  );

  const handleReset = useCallback(() => {
    clearProgress(pkg.manifest.id, pkg.manifest.version);
    setProgressKey((k) => k + 1);
  }, [pkg.manifest.id, pkg.manifest.version]);

  if (!engine) {
    return (
      <div className="text-error p-8">
        <p>No workflow defined.</p>
      </div>
    );
  }

  return (
    <AccessibilityProvider>
      <RuntimeProvider
        loadedPackage={pkg}
        engine={engine}
        initialProgress={initialProgress}
        onProgressChange={handleProgressChange}
        widgetRegistry={widgetRegistry}
      >
        <div className="relative flex h-full flex-col">
          <div className="border-outline-variant bg-surface flex items-center justify-end border-b px-4 py-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t('studio.preview.resetProgress')}
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <LayoutShell />
          </div>
        </div>
      </RuntimeProvider>
    </AccessibilityProvider>
  );
}
