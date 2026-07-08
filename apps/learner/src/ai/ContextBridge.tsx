import { useEffect, useRef } from 'react';
import type { ContextManager } from '@open-edu/ai-companion';
import { useRuntimeOptional } from '@open-edu/runtime';

export interface ContextBridgeProps {
  contextManager: ContextManager;
}

export function ContextBridge({ contextManager }: ContextBridgeProps): null {
  const runtime = useRuntimeOptional();
  const lastContextRef = useRef('');

  useEffect(() => {
    if (!runtime) return;

    const pkg = runtime.loadedPackage;
    const node = runtime.currentNode;

    const ctx = {
      courseId: pkg.manifest.id,
      courseTitle: pkg.manifest.title,
      lessonId: runtime.currentNodeId,
      lessonTitle: node?.node.title ?? runtime.currentNodeId,
      pageContent:
        node && 'body' in node.node
          ? (node.node as { body?: { content?: string } }).body?.content
          : undefined,
    };

    const ctxJson = JSON.stringify(ctx);
    if (ctxJson !== lastContextRef.current) {
      lastContextRef.current = ctxJson;
      contextManager.updateContext(ctx);
    }
  }, [runtime, contextManager, runtime?.currentNodeId]);

  return null;
}
