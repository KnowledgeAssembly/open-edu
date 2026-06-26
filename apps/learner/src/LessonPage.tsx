import { useState, useMemo } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import {
  SideNav,
  TopAppBar,
  CourseTree,
  NodeRenderer,
  AITutorPanel,
  ReadingRuler,
  type ThemeId,
} from '@open-edu/runtime';
import { buildModules } from './buildModules';

export interface LessonPageProps {
  pkg: LoadedPackage;
  nodeId: string;
  onNavigate: (page: string, nodeId?: string) => void;
  currentThemeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
}

export function LessonPage({
  pkg,
  nodeId,
  onNavigate,
  currentThemeId,
  onThemeChange,
}: LessonPageProps): JSX.Element {
  const [aiPanelVisible, setAiPanelVisible] = useState(true);
  const [readingRulerVisible, setReadingRulerVisible] = useState(false);

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
    <div className="flex h-screen overflow-hidden">
      <SideNav courseTitle={pkg.manifest.title}>
        <CourseTree modules={modules} onLessonClick={(id) => onNavigate('lesson', id)} />
      </SideNav>

      <div className="flex-1 flex flex-col min-w-0 bg-surface relative">
        <TopAppBar
          breadcrumbs={breadcrumbs}
          showA11yControls
          onAskAiClick={() => setAiPanelVisible((v) => !v)}
          onReadingRulerChange={(enabled) => setReadingRulerVisible(enabled)}
          currentThemeId={currentThemeId}
          onThemeChange={onThemeChange}
        />

        <main className="flex-1 overflow-y-auto relative w-full flex justify-center">
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
        </main>
      </div>

      <AITutorPanel visible={aiPanelVisible} />
    </div>
  );
}
