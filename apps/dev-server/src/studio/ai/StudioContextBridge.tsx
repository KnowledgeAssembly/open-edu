import { useEffect } from 'react';
import { studioContextSnapshotSchema } from './context';
import { useStudioAssistant } from './index';

interface StudioContextBridgeProps {
  view: string;
  selectedPath: string | null;
  loadedPackage: any | null;
  aiAvailable: boolean;
  locale: string;
  api?: {
    getOutline: () => Promise<{ activities: Array<{ path: string; title: string; kind: string }>; title: string }>;
    readFile?: (path: string) => Promise<{ path: string; content: string }>;
  };
}

export function StudioContextBridge({
  view,
  selectedPath,
  loadedPackage,
  aiAvailable,
  locale,
  api,
}: StudioContextBridgeProps) {
  const { setContext } = useStudioAssistant();

  useEffect(() => {
    async function syncContext() {
      const snapshot: any = {
        view,
        locale,
        aiAvailable,
      };

      if (loadedPackage) {
        snapshot.course = {
          id: loadedPackage.manifest.id,
          title: loadedPackage.manifest.title,
          activityCount: 0,
          outline: [],
        };

        if (api) {
          try {
            const outline = await api.getOutline();
            snapshot.course.activityCount = outline.activities.length;
            snapshot.course.outline = outline.activities.map((a: any) => ({
              title: a.title || 'Untitled',
              kind: a.kind || 'other',
              path: a.path,
            }));
          } catch {
            // Fallback: derive from workflow if available
            if (loadedPackage.workflow?.routing) {
              const paths = Object.keys(loadedPackage.workflow.routing);
              snapshot.course.activityCount = paths.length;
              snapshot.course.outline = paths.map((path: string) => ({
                title: path.split('/').pop() || 'Untitled',
                kind: 'other',
                path,
              }));
            }
          }
        }
      }

      if (selectedPath && loadedPackage) {
        snapshot.activity = {
          path: selectedPath,
          kind: 'other',
          title: selectedPath.split('/').pop() || 'Activity',
        };

        if (api?.getOutline) {
          try {
            const outline = await api.getOutline();
            const activity = outline.activities.find((a: any) => a.path === selectedPath);
            if (activity) {
              snapshot.activity = {
                path: activity.path,
                kind: activity.kind || 'other',
                title: activity.title || activity.path.split('/').pop(),
              };
            }
          } catch {
            // ignore
          }
        }
      }

      const validated = studioContextSnapshotSchema.parse(snapshot);
      setContext(validated);
    }

    void syncContext();
  }, [view, selectedPath, loadedPackage, aiAvailable, locale, setContext, api]);

  return null;
}