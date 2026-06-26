import { useMemo } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import { SideNav, TopAppBar } from '@open-edu/runtime';
import { getProgress } from './progressStorage';

export interface ProgressPageProps {
  pkg: LoadedPackage;
  onNavigate: (page: string, nodeId?: string) => void;
}

export function ProgressPage({ pkg, onNavigate }: ProgressPageProps): JSX.Element {
  const progress = getProgress(pkg.manifest.id);
  const totalNodes = pkg.nodes.length;
  const completedCount = progress?.visitedNodes?.length ?? 0;
  const percent = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;

  const recentActivity = useMemo(() => {
    if (!progress?.visitedNodes) return [];
    return progress.visitedNodes
      .map((nodeId) => {
        const node = pkg.nodes.find((n) => n.relativePath === nodeId);
        const score = progress.scores?.[nodeId];
        return {
          id: nodeId,
          title: node ? ((node.node as { title?: string }).title ?? nodeId) : nodeId,
          score: score ?? null,
          label:
            score != null
              ? score >= 80
                ? 'Excellent'
                : score >= 60
                  ? 'Good'
                  : 'Needs Review'
              : 'Completed',
          labelColor:
            score != null
              ? score >= 80
                ? 'text-primary'
                : score >= 60
                  ? 'text-secondary'
                  : 'text-error'
              : 'text-outline',
        };
      })
      .reverse()
      .slice(0, 10);
  }, [progress, pkg.nodes]);

  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav
        courseTitle={pkg.manifest.title}
        onResumeLesson={
          progress?.currentNodeId ? () => onNavigate('lesson', progress.currentNodeId!) : undefined
        }
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopAppBar
          breadcrumbs={[{ label: 'My Progress' }]}
          showA11yControls
          onAskAiClick={() => {}}
        />

        <main className="flex-1 overflow-y-auto bg-surface">
          <div className="max-w-7xl mx-auto w-full p-md md:p-lg lg:p-xl space-y-lg">
            <div className="mb-xl">
              <h2 className="text-display-lg font-display text-on-surface">My Progress</h2>
              <p className="text-body-reading font-body-reading text-on-surface-variant mt-sm max-w-2xl">
                A comprehensive view of your learning journey in {pkg.manifest.title}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-h2 font-title text-on-surface mb-sm">Course Completion</h3>
                  <p className="text-on-surface-variant mb-xl">{pkg.manifest.title}</p>
                </div>
                <div className="flex items-end gap-md">
                  <div className="text-[72px] font-bold leading-none text-primary tracking-tighter">
                    {percent}%
                  </div>
                  <div className="mb-sm text-on-surface-variant">
                    <p>
                      {completedCount}/{totalNodes} Lessons Completed
                    </p>
                  </div>
                </div>
                <div className="mt-lg">
                  <div className="w-full bg-surface-container-high rounded-full h-xs overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-sm font-mono text-mono text-outline">
                    <span>Start</span>
                    <span>Target</span>
                  </div>
                </div>
              </div>

              <div className="bg-tertiary-container/10 border border-tertiary-container rounded-xl p-lg flex flex-col">
                <div className="flex items-center gap-sm mb-md text-tertiary">
                  <h3 className="font-bold">AI Insights</h3>
                </div>
                <p className="text-body-reading font-body-reading text-on-surface-variant mb-auto">
                  {completedCount === 0
                    ? 'Start your learning journey to receive personalized insights.'
                    : percent >= 80
                      ? 'Great progress! You&apos;re nearing completion.'
                      : 'Keep going! Regular practice will help solidify your understanding.'}
                </p>
                {completedCount > 0 && (
                  <button
                    onClick={() => onNavigate('course-home')}
                    className="mt-md w-full border border-tertiary text-tertiary font-bold py-sm rounded hover:bg-tertiary-container/20 transition-colors"
                  >
                    Continue Learning
                  </button>
                )}
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col items-center">
                <h3 className="text-h2 font-title text-on-surface mb-lg w-full text-left">
                  Mastery Profile
                </h3>
                <div className="w-full max-w-[200px] aspect-square flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-sm">
                      {percent >= 80
                        ? '\uD83C\uDF1F'
                        : percent >= 50
                          ? '\uD83D\uDCC8'
                          : '\uD83C\uDFAF'}
                    </div>
                    <p className="text-sm text-on-surface-variant">
                      {percent >= 80
                        ? 'Advanced'
                        : percent >= 50
                          ? 'Intermediate'
                          : 'Getting Started'}
                    </p>
                    <div className="mt-2 flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <div
                          key={dot}
                          className={`w-2 h-2 rounded-full ${
                            dot <= Math.ceil(percent / 20) ? 'bg-primary' : 'bg-surface-variant'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                <h3 className="text-h2 font-title text-on-surface mb-lg">
                  Recent Activity &amp; Scores
                </h3>
                {recentActivity.length === 0 ? (
                  <p className="text-on-surface-variant text-center py-lg">
                    No activity yet. Start a lesson to track your progress.
                  </p>
                ) : (
                  <div className="space-y-sm">
                    {recentActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-sm hover:bg-surface-container-low rounded-lg transition-colors border-b border-outline-variant/30 last:border-0"
                      >
                        <div className="flex items-center gap-md">
                          <div className="bg-primary-container text-on-primary-container p-sm rounded flex items-center justify-center">
                            <span className="text-sm">{'\uD83D\uDCD6'}</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{item.title}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.score != null ? (
                            <>
                              <span className="font-mono text-mono font-bold text-on-surface">
                                {item.score}/100
                              </span>
                              <p className={`text-xs ${item.labelColor}`}>{item.label}</p>
                            </>
                          ) : (
                            <>
                              <span className="font-mono text-mono text-outline">100%</span>
                              <p className="text-xs text-outline-variant">{item.label}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
