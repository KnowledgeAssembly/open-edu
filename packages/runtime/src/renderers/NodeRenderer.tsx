import type { LoadedNode } from '@open-edu/core';
import { useRuntime } from '../context/RuntimeContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizRenderer } from './QuizRenderer';
import { ReflectionRenderer } from './ReflectionRenderer';
import { PlaceholderRenderer } from './PlaceholderRenderer';

export interface NodeRendererProps {
  node: LoadedNode | null;
  onComplete?: (score?: number) => void;
}

export function NodeRenderer({ node, onComplete }: NodeRendererProps): JSX.Element {
  const { completeNode } = useRuntime();
  const handleComplete = onComplete ?? completeNode;

  if (!node) {
    return (
      <div role="status" aria-live="polite" data-testid="node-renderer-empty">
        <p>Loading…</p>
      </div>
    );
  }

  switch (node.node.type) {
    case 'lesson':
      return <MarkdownRenderer content={node.content} />;

    case 'quiz':
      return <QuizRenderer node={node.node} onSubmit={(score) => handleComplete(score)} />;

    case 'reflection':
      return <ReflectionRenderer node={node.node} onSubmit={() => handleComplete()} />;

    case 'exercise':
      return (
        <PlaceholderRenderer
          nodeType="exercise"
          reason="Exercise widget rendering will be provided by the widgets package."
        />
      );

    case 'custom':
      return (
        <PlaceholderRenderer
          nodeType="custom"
          reason="Custom widget rendering will be provided by the widgets package."
        />
      );

    default:
      return <PlaceholderRenderer nodeType={String((node.node as { type: unknown }).type)} />;
  }
}
