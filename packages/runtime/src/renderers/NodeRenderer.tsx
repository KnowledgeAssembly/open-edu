import { useEffect, useRef } from 'react';
import type { LoadedNode } from '@open-edu/core';
import { useRuntimeOptional } from '../context/RuntimeContext';
import { FocusTrap, useLiveRegion } from '@open-edu/accessibility';
import { MarkdownRenderer } from './MarkdownRenderer';
import { QuizRenderer } from './QuizRenderer';
import { ReflectionRenderer } from './ReflectionRenderer';
import { WidgetRenderer } from './WidgetRenderer';
import { PlaceholderRenderer } from './PlaceholderRenderer';

export interface NodeRendererProps {
  node: LoadedNode | null;
  onComplete?: (score?: number) => void;
}

export function NodeRenderer({ node, onComplete }: NodeRendererProps): JSX.Element {
  const runtime = useRuntimeOptional();
  const handleComplete: (score?: number) => void =
    onComplete ?? runtime?.completeNode ?? (() => {});
  const { announce } = useLiveRegion();
  const announcedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (node && !announcedRef.current.has(node.relativePath)) {
      announcedRef.current.add(node.relativePath);
      const title = (node.node as { title?: string }).title ?? node.relativePath;
      announce(`Loaded ${node.node.type}: ${title}`);
    }
  }, [node, announce]);

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
      return (
        <QuizRenderer
          key={node.relativePath}
          node={node.node}
          onSubmit={(score) => handleComplete(score)}
        />
      );

    case 'reflection':
      return (
        <ReflectionRenderer
          key={node.relativePath}
          node={node.node}
          onSubmit={() => handleComplete()}
        />
      );

    case 'exercise':
      return (
        <FocusTrap key={node.relativePath}>
          <WidgetRenderer node={node.node} nodeId={node.relativePath} />
        </FocusTrap>
      );

    case 'custom':
      return (
        <FocusTrap key={node.relativePath}>
          <WidgetRenderer node={node.node} nodeId={node.relativePath} />
        </FocusTrap>
      );

    default:
      return <PlaceholderRenderer nodeType={String((node.node as { type: unknown }).type)} />;
  }
}
