import { useMemo, useState } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import { SideNav, TopAppBar, CourseTree, NodeRenderer, AITutorPanel } from '@open-edu/runtime';
import type { CourseTreeModule } from '@open-edu/runtime';

export interface CodePageProps {
  pkg: LoadedPackage;
  nodeId: string;
  onNavigate: (page: string, nodeId?: string) => void;
}

function buildModules(pkg: LoadedPackage, activeNodeId: string): CourseTreeModule[] {
  const nodes = pkg.nodes;
  if (nodes.length === 0) return [];

  const grouped: Record<string, CourseTreeModule> = {};
  let moduleIndex = 0;

  for (const node of nodes) {
    const parts = node.relativePath.split('/');
    const firstPart = parts[0];
    if (!firstPart) continue;
    const moduleKey = parts.length > 1 ? firstPart : `module-${moduleIndex}`;
    if (!grouped[moduleKey]) {
      moduleIndex++;
      grouped[moduleKey] = {
        title: `Module ${moduleIndex}`,
        lessons: [],
        isLocked: moduleIndex > 1,
      };
    }
    const isActive = node.relativePath === activeNodeId;
    grouped[moduleKey]!.lessons.push({
      id: node.relativePath,
      title: (node.node as { title?: string }).title ?? node.relativePath,
      isActive,
    });
  }

  const entries = Object.entries(grouped);
  const firstEntry = entries[0];
  if (firstEntry) firstEntry[1].isLocked = false;
  return entries.map(([, mod]) => mod);
}

export function CodePage({ pkg, nodeId, onNavigate }: CodePageProps): JSX.Element {
  const [aiPanelVisible, setAiPanelVisible] = useState(true);

  const currentNode = useMemo(
    () => pkg.nodes.find((n) => n.relativePath === nodeId) ?? null,
    [pkg, nodeId],
  );

  const modules = useMemo(() => buildModules(pkg, nodeId), [pkg, nodeId]);

  const breadcrumbs = [
    { label: pkg.manifest.title, href: '#' },
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
            <button className="text-on-surface-variant hover:text-on-surface" aria-label="Zoom in">
              {'\uD83D\uDD0D'}
            </button>
            <div className="w-px h-4 bg-outline-variant" />
            <button
              className="text-on-surface-variant hover:text-on-surface"
              aria-label="Adjust font size"
            >
              {'\uD83D\uDD21'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative w-full flex justify-center">
          <article className="w-full max-w-container-max px-lg py-xl pb-[120px]">
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
