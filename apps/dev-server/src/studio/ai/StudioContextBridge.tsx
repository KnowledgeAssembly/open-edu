import { useEffect } from 'react';
import {
  ActivityKindSchema,
  buildOutlineSummary,
  studioContextSnapshotSchema,
  truncateExcerpt,
  type ActivityKind,
} from './context';
import { useStudioAssistant } from './StudioAssistantProvider';

interface StudioContextBridgeProps {
  view: string;
  selectedPath: string | null;
  loadedPackage: {
    manifest: { id: string; title: string };
    workflow?: { routing?: Record<string, unknown> } | null;
  } | null;
  aiAvailable: boolean;
  locale: string;
  api?: {
    getOutline: () => Promise<{
      activities: Array<{ path: string; title: string; kind: string }>;
      title: string;
    }>;
    readFile?: (path: string) => Promise<{ path: string; content: string }>;
  };
}

function coerceKind(kind: string | undefined): ActivityKind {
  const parsed = ActivityKindSchema.safeParse(kind);
  return parsed.success ? parsed.data : 'other';
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
    let cancelled = false;

    async function syncContext() {
      const snapshot: Record<string, unknown> = {
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
            const summarized = buildOutlineSummary(
              outline.activities.map((a) => ({
                title: a.title,
                kind: coerceKind(a.kind),
                path: a.path,
              })),
            );
            (snapshot.course as { activityCount: number; outline: unknown[] }).activityCount =
              outline.activities.length;
            (snapshot.course as { outline: unknown[] }).outline = summarized;
          } catch {
            if (loadedPackage.workflow?.routing) {
              const paths = Object.keys(loadedPackage.workflow.routing);
              const summarized = buildOutlineSummary(
                paths.map((path) => ({
                  title: path.split('/').pop() || 'Untitled',
                  kind: 'other' as const,
                  path,
                })),
              );
              (snapshot.course as { activityCount: number; outline: unknown[] }).activityCount =
                paths.length;
              (snapshot.course as { outline: unknown[] }).outline = summarized;
            }
          }
        }
      }

      if (selectedPath && loadedPackage) {
        const activity: {
          path: string;
          kind: ActivityKind;
          title?: string;
          contentExcerpt?: string;
        } = {
          path: selectedPath,
          kind: 'other',
          title: selectedPath.split('/').pop() || 'Activity',
        };

        if (api?.getOutline) {
          try {
            const outline = await api.getOutline();
            const match = outline.activities.find((a) => a.path === selectedPath);
            if (match) {
              activity.kind = coerceKind(match.kind);
              activity.title = match.title || match.path.split('/').pop();
            }
          } catch {
            // keep defaults
          }
        }

        if (api?.readFile) {
          try {
            const file = await api.readFile(selectedPath);
            activity.contentExcerpt = truncateExcerpt(file.content);
          } catch {
            // excerpt optional
          }
        }

        snapshot.activity = activity;
      }

      if (cancelled) return;
      const validated = studioContextSnapshotSchema.parse(snapshot);
      setContext(validated);
    }

    // Publish a minimal snapshot immediately so chat never posts null context.
    setContext(
      studioContextSnapshotSchema.parse({
        view,
        locale,
        aiAvailable,
      }),
    );
    void syncContext();

    return () => {
      cancelled = true;
    };
  }, [view, selectedPath, loadedPackage, aiAvailable, locale, setContext, api]);

  return null;
}
