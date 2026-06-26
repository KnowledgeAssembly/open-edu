import { useMemo, useCallback } from 'react';
import type { LoadedPackage } from '@open-edu/core';
import type { QuizNode } from '@open-edu/schemas';
import { QuizRenderer, AICallout } from '@open-edu/runtime';
import { getProgress, saveProgress } from './progressStorage';

export interface AssessmentPageProps {
  pkg: LoadedPackage;
  nodeId: string;
  onNavigate: (page: string, nodeId?: string) => void;
}

export function AssessmentPage({ pkg, nodeId, onNavigate }: AssessmentPageProps): JSX.Element {
  const currentNode = useMemo(
    () => pkg.nodes.find((n) => n.relativePath === nodeId) ?? null,
    [pkg, nodeId],
  );

  const isQuiz = currentNode?.node.type === 'quiz';
  const quizNode = isQuiz ? (currentNode!.node as QuizNode) : null;

  const handleSubmit = useCallback(
    (score: number, _optionId: string) => {
      if (currentNode) {
        const snap = getProgress(pkg.manifest.id);
        if (snap) {
          saveProgress(pkg.manifest.id, {
            ...snap,
            scores: { ...snap.scores, [currentNode.relativePath]: score },
          });
        }
      }
    },
    [currentNode, pkg.manifest.id],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-surface/80 backdrop-blur-md border-b border-outline-variant sticky top-0 z-50 flex justify-between items-center h-xl px-md w-full">
        <div className="flex items-center gap-base">
          <button
            onClick={() => onNavigate('course-home')}
            className="p-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors"
            aria-label="Exit Quiz"
          >
            <span className="text-lg">{'\u2715'}</span>
          </button>
          <span className="text-h2 font-title text-on-surface ml-sm">
            {currentNode
              ? ((currentNode.node as { title?: string }).title ?? 'Assessment')
              : 'Assessment'}
          </span>
        </div>
      </header>

      <main className="flex-grow flex justify-center py-lg px-md">
        <div className="w-full max-w-container-max flex flex-col gap-lg">
          {!quizNode ? (
            <div className="bg-surface rounded-xl border border-outline-variant p-lg text-center">
              <p className="text-on-surface-variant">
                {currentNode
                  ? 'This node is not a quiz. Please select a quiz from the course.'
                  : `Assessment not found: ${nodeId}`}
              </p>
              <button
                onClick={() => onNavigate('course-home')}
                className="mt-md bg-primary text-on-primary px-lg py-sm rounded font-semibold"
              >
                Back to Course
              </button>
            </div>
          ) : (
            <>
              <div className="bg-surface rounded-xl border border-outline-variant p-lg flex flex-col gap-md shadow-sm">
                <div className="inline-flex items-center px-sm py-xs rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps self-start">
                  Assessment
                </div>

                <h1 className="text-h1 font-display text-on-surface leading-tight">
                  {quizNode.question}
                </h1>

                <QuizRenderer node={quizNode} onSubmit={handleSubmit} />
              </div>

              <div className="flex justify-center mt-md">
                <button
                  onClick={() => onNavigate('course-home')}
                  className="bg-primary text-on-primary px-lg py-sm rounded font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Finish &amp; Return
                </button>
              </div>

              <section className="mt-xl">
                <AICallout title="Need a hint?">
                  Consider what you&apos;ve learned in the previous lessons. Review the key concepts
                  if you&apos;re unsure.
                </AICallout>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
