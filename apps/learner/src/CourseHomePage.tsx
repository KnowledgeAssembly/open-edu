import { useMemo } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import { SideNav, TopAppBar, CourseTree, AICallout, type ThemeId } from '@open-edu/runtime';
import { getProgress } from './progressStorage';
import { buildModules } from './buildModules';

export interface CourseHomePageProps {
  pkg: LoadedPackage;
  onNavigate: (page: string, nodeId?: string) => void;
  currentThemeId?: ThemeId;
  onThemeChange?: (id: ThemeId) => void;
}

export function CourseHomePage({
  pkg,
  onNavigate,
  currentThemeId,
  onThemeChange,
}: CourseHomePageProps): JSX.Element {
  const progress = getProgress(pkg.manifest.id);
  const totalNodes = pkg.nodes.length;
  const completedNodes = progress?.visitedNodes?.length ?? 0;
  const percent = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  const modules = useMemo(() => buildModules(pkg), [pkg]);

  const currentLessonId = progress?.currentNodeId;

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav
        courseTitle={pkg.manifest.title}
        onResumeLesson={currentLessonId ? () => onNavigate('lesson', currentLessonId) : undefined}
      >
        <CourseTree modules={modules} onLessonClick={(id) => onNavigate('lesson', id)} />
      </SideNav>

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar
          breadcrumbs={[{ label: pkg.manifest.title }]}
          showA11yControls
          onAskAiClick={() => {}}
          currentThemeId={currentThemeId}
          onThemeChange={onThemeChange}
        />

        <main className="flex-1 overflow-y-auto bg-surface flex justify-center pb-xl">
          <div className="w-full max-w-container-max px-md py-lg flex flex-col gap-lg">
            <section className="flex flex-col gap-md">
              <div>
                <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase mb-xs block">
                  {pkg.manifest.author ?? 'Course'}
                </span>
                <h1 className="font-display text-display-lg text-on-surface mb-sm">
                  {pkg.manifest.title}
                </h1>
                <p className="font-body-reading text-body-reading text-on-surface-variant max-w-2xl">
                  Course overview and learning path for {pkg.manifest.title}.
                </p>
              </div>

              <div className="bg-surface-container-low border border-outline-variant rounded-xl p-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md">
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-end mb-sm">
                    <div>
                      <h2 className="text-h2 font-title text-on-surface">Overall Progress</h2>
                      <p className="text-on-surface-variant text-sm mt-xs">
                        {completedNodes} of {totalNodes} lessons
                      </p>
                    </div>
                    <span className="text-h1 font-display text-primary">{percent}%</span>
                  </div>
                  <div className="h-1 w-full bg-surface-variant rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
                {currentLessonId && (
                  <button
                    onClick={() => onNavigate('lesson', currentLessonId)}
                    className="bg-primary text-on-primary font-bold py-sm px-lg rounded flex items-center gap-sm hover:opacity-90 transition-opacity whitespace-nowrap w-full sm:w-auto justify-center"
                  >
                    Continue Learning
                    <span className="text-lg">{'\u2192'}</span>
                  </button>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="md:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col">
                <h2 className="text-h2 font-title text-on-surface mb-md">Your Path</h2>
                <div className="flex-1 flex flex-col gap-0 relative">
                  {modules.map((mod, idx) => (
                    <div key={mod.title} className="flex gap-md relative">
                      {idx < modules.length - 1 && (
                        <div className="w-px bg-outline-variant absolute left-3 top-6 z-0" />
                      )}
                      <div className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                            mod.isLocked
                              ? 'border-2 border-outline-variant bg-surface'
                              : idx === 0
                                ? 'border-2 border-primary bg-surface ring-4 ring-primary-container/30'
                                : 'bg-primary text-on-primary'
                          }`}
                        >
                          {mod.isLocked ? (
                            <span className="text-xs text-outline-variant">{'\uD83D\uDD12'}</span>
                          ) : idx === 0 ? (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          ) : (
                            <span className="text-xs">{'\u2713'}</span>
                          )}
                        </div>
                      </div>
                      <div className={`pb-lg ${mod.isLocked ? 'opacity-50' : ''}`}>
                        <h3
                          className={`font-bold ${idx === 0 ? 'text-primary' : 'text-on-surface'}`}
                        >
                          {mod.title}
                        </h3>
                        <p className="text-on-surface-variant text-xs mt-1">
                          {mod.isLocked ? 'Locked' : idx === 0 ? 'Current Focus' : 'Completed'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col gap-sm">
                <h2 className="text-h2 font-title text-on-surface mb-xs">Current Modules</h2>
                {modules.slice(0, 3).map((mod, idx) => (
                  <div
                    key={mod.title}
                    className={`rounded-xl p-md flex flex-col sm:flex-row gap-md cursor-pointer transition-colors duration-200 ${
                      idx === 0
                        ? 'bg-primary-fixed/20 border-2 border-primary relative overflow-hidden'
                        : 'bg-surface border border-outline-variant hover:border-primary'
                    }`}
                  >
                    {idx === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                    <div
                      className={`w-12 h-12 rounded flex items-center justify-center flex-shrink-0 ${
                        idx === 0
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="text-lg">
                        {['\uD83D\uDCDA', '\uD83D\uDD17', '\uD83D\uDD0C'][idx] ?? '\uD83D\uDCD6'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-on-surface">{mod.title}</h3>
                        <span className="bg-surface-container px-2 py-1 rounded text-xs font-mono text-on-surface-variant">
                          {mod.lessons.length} {mod.lessons.length === 1 ? 'lesson' : 'lessons'}
                        </span>
                      </div>
                      <p className="text-on-surface-variant mt-1 text-sm">
                        {mod.lessons.map((l) => l.title).join(', ')}
                      </p>
                      <div className="mt-sm flex items-center gap-2">
                        {idx === 0 ? (
                          <>
                            <div className="h-1 w-24 bg-surface-variant rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full w-2/5" />
                            </div>
                            <span className="text-xs text-on-surface-variant">In Progress</span>
                          </>
                        ) : (
                          <span className="text-xs text-outline font-semibold">
                            {mod.isLocked ? 'Locked' : 'Not Started'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-md">
              <AICallout title="AI Learning Insight">
                You're making great progress. Focus on completing the current module to unlock the
                next set of lessons.
              </AICallout>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
