import { useMemo, useState } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import { SideNav, TopAppBar, CourseTree, NodeRenderer, AITutorPanel } from '@open-edu/runtime';
import { buildModules } from './buildModules';

export interface CodePageProps {
  pkg: LoadedPackage;
  nodeId: string;
  onNavigate: (page: string, nodeId?: string) => void;
}

export function CodePage({ pkg, nodeId, onNavigate }: CodePageProps): JSX.Element {
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSizeLevel, setFontSizeLevel] = useState(100);

  const currentNode = useMemo(
    () => pkg.nodes.find((n) => n.relativePath === nodeId) ?? null,
    [pkg, nodeId],
  );

  const modules = useMemo(() => buildModules(pkg, nodeId), [pkg, nodeId]);

  const breadcrumbs = [
    { label: pkg.manifest.title },
    { label: currentNode ? ((currentNode.node as { title?: string }).title ?? nodeId) : nodeId },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-surface-dim text-on-surface">
      <SideNav courseTitle={pkg.manifest.title}>
        <CourseTree modules={modules} onLessonClick={(id) => onNavigate('lesson', id)} />
      </SideNav>

      <main className="flex-1 flex flex-col min-w-0 bg-surface-dim relative">
        <TopAppBar
          breadcrumbs={breadcrumbs}
          showA11yControls
          onAskAiClick={() => setAiPanelVisible((v) => !v)}
        />

        <div className="flex items-center gap-md px-lg py-sm border-b border-outline-variant bg-surface-container-lowest/50">
          <div className="flex items-center bg-surface-container rounded-full px-sm py-xs gap-sm">
            <button
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Zoom in"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 200))}
            >
              {'\uD83D\uDD0D'}
            </button>
            <span className="text-mono text-mono text-outline text-xs min-w-[2rem] text-center">
              {zoomLevel}%
            </span>
            <div className="w-px h-4 bg-outline-variant" />
            <button
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Increase font size"
              onClick={() => setFontSizeLevel((f) => Math.min(f + 10, 200))}
            >
              {'\uD83D\uDD21'}
            </button>
            <span className="text-mono text-mono text-outline text-xs min-w-[2rem] text-center">
              {fontSizeLevel}%
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative w-full flex justify-center">
          <article
            className="w-full max-w-container-max px-lg py-xl pb-[120px]"
            style={{ fontSize: `${fontSizeLevel}%`, zoom: `${zoomLevel}%` }}
          >
            {currentNode ? (
              <NodeRenderer node={currentNode} />
            ) : (
              <div className="text-center py-xl text-on-surface-variant">
                Lesson not found: {nodeId}
              </div>
            )}
          </article>
        </div>
      </main>

      <AITutorPanel visible={aiPanelVisible} />
    </div>
  );
}
