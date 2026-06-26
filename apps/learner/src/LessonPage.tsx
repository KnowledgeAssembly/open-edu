import { useState, useMemo } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import {
  SideNav,
  TopAppBar,
  CourseTree,
  NodeRenderer,
  AITutorPanel,
  ReadingRuler,
} from '@open-edu/runtime';
import type { CourseTreeModule } from '@open-edu/runtime';

export interface LessonPageProps {
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
  if (firstEntry) {
    firstEntry[1].isLocked = false;
  }

  return entries.map(([, mod]) => mod);
}

export function LessonPage({ pkg, nodeId, onNavigate }: LessonPageProps): JSX.Element {
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [readingRulerVisible] = useState(false);

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
    <div className="flex h-screen overflow-hidden">
      <SideNav courseTitle={pkg.manifest.title}>
        <CourseTree modules={modules} onLessonClick={(id) => onNavigate('lesson', id)} />
      </SideNav>

      <main className="flex-1 flex flex-col min-w-0 bg-surface relative">
        <TopAppBar
          breadcrumbs={breadcrumbs}
          showA11yControls
          onAskAiClick={() => setAiPanelVisible((v) => !v)}
        />

        <div className="flex-1 overflow-y-auto relative w-full flex justify-center">
          <ReadingRuler visible={readingRulerVisible} />

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
