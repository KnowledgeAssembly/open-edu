import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';

export interface RuntimeContextValue {
  loadedPackage: LoadedPackage;
  currentNode: LoadedNode | null;
  currentNodeId: string;
  isCompleted: boolean;
  scores: Record<string, number>;
  lastScore: number | null;
  visitedNodes: string[];
  completeNode: (score?: number) => void;
  getNode: (nodeId: string) => LoadedNode | undefined;
}

export interface RuntimeProviderProps {
  loadedPackage: LoadedPackage;
  engine: WorkflowEngine;
  children: ReactNode;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({
  loadedPackage,
  engine,
  children,
}: RuntimeProviderProps): JSX.Element {
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<string[]>([]);

  const nodeMap = useMemo(() => {
    const map: Record<string, LoadedNode> = {};
    for (const node of loadedPackage.nodes) {
      map[node.relativePath] = node;
    }
    return map;
  }, [loadedPackage.nodes]);

  const getNode = useCallback(
    (nodeId: string): LoadedNode | undefined => nodeMap[nodeId],
    [nodeMap],
  );

  const completeNode = useCallback(
    (score?: number) => {
      engine.completeNode(score);
    },
    [engine],
  );

  useEffect(() => {
    const handleEvent = (event: WorkflowEvent) => {
      if (event.type === 'node.entered' && event.nodeId) {
        const id = event.nodeId;
        setCurrentNodeId(id);
        setVisitedNodes((prev) => (prev[prev.length - 1] === id ? prev : [...prev, id]));
      } else if (event.type === 'node.completed' && event.nodeId) {
        if (typeof event.score === 'number') {
          setScores((prev) => ({ ...prev, [event.nodeId!]: event.score! }));
          setLastScore(event.score);
        }
      } else if (event.type === 'workflow.completed') {
        setIsCompleted(true);
      }
    };

    const unsubscribe = engine.subscribe(handleEvent);
    engine.start();

    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  const value = useMemo<RuntimeContextValue>(
    () => ({
      loadedPackage,
      currentNode: currentNodeId ? (nodeMap[currentNodeId] ?? null) : null,
      currentNodeId,
      isCompleted,
      scores,
      lastScore,
      visitedNodes,
      completeNode,
      getNode,
    }),
    [
      loadedPackage,
      currentNodeId,
      nodeMap,
      isCompleted,
      scores,
      lastScore,
      visitedNodes,
      completeNode,
      getNode,
    ],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) {
    throw new Error(
      'useRuntime must be used within a <RuntimeProvider>. Wrap your component tree with <RuntimeProvider loadedPackage={...} engine={...}>.',
    );
  }
  return ctx;
}
