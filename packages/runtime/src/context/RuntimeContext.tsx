import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { LoadedPackage, LoadedNode } from '@open-edu/core';
import type { WorkflowEngine, WorkflowEvent } from '@open-edu/workflow';
import type { WidgetRegistry } from '@open-edu/widgets';
import { LiveRegionProvider, useLiveRegion } from '@open-edu/accessibility';
import type { ProgressSnapshot, SkillGraph, MasteryLevel } from '@open-edu/schemas';
import { buildProgressSnapshot } from './progress';
import { computeSkillScores, getSkillMastery } from './skills';

export interface RuntimeContextValue {
  loadedPackage: LoadedPackage;
  currentNode: LoadedNode | null;
  currentNodeId: string;
  isCompleted: boolean;
  scores: Record<string, number>;
  lastScore: number | null;
  visitedNodes: string[];
  completeNode: (score?: number) => void;
  navigateToNode: (nodeId: string) => void;
  getNode: (nodeId: string) => LoadedNode | undefined;
  widgetRegistry: WidgetRegistry | undefined;
  progressSnapshot: ProgressSnapshot | null;
  skillScores: Record<string, number>;
  getSkillMastery: (skillId: string) => MasteryLevel;
  skillGraph: SkillGraph | undefined;
}

export interface RuntimeProviderProps {
  loadedPackage: LoadedPackage;
  engine: WorkflowEngine;
  children: ReactNode;
  widgetRegistry?: WidgetRegistry;
  initialProgress?: ProgressSnapshot;
  onProgressChange?: (snapshot: ProgressSnapshot) => void;
  packageId?: string;
  packageVersion?: string;
  skillGraph?: SkillGraph;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function RuntimeProvider({
  loadedPackage,
  engine,
  children,
  widgetRegistry,
  initialProgress,
  onProgressChange,
  packageId,
  packageVersion,
  skillGraph,
}: RuntimeProviderProps): JSX.Element {
  const skillsRef = useRef(skillGraph);
  skillsRef.current = skillGraph;
  const nodeMap = useMemo(() => {
    const map: Record<string, LoadedNode> = {};
    for (const node of loadedPackage.nodes) {
      map[node.relativePath] = node;
    }
    return map;
  }, [loadedPackage.nodes]);

  const initialSnapshotValid = useMemo(() => {
    if (!initialProgress) return false;
    if (initialProgress.isCompleted) return true;
    return nodeMap[initialProgress.currentNodeId] !== undefined;
  }, [initialProgress, nodeMap]);

  const hasInitialProgress = initialProgress !== undefined;

  useEffect(() => {
    if (hasInitialProgress && !initialSnapshotValid) {
      console.warn(
        `Invalid progress snapshot for "${loadedPackage.manifest.id}" — currentNodeId "${initialProgress!.currentNodeId}" not found in package nodes. Starting from entry.`,
      );
    }
  }, [hasInitialProgress, initialSnapshotValid]); // eslint-disable-line react-hooks/exhaustive-deps

  const [currentNodeId, setCurrentNodeId] = useState<string>(
    initialSnapshotValid ? initialProgress!.currentNodeId : (loadedPackage.manifest.entry ?? ''),
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(
    initialSnapshotValid ? initialProgress!.isCompleted : false,
  );
  const [scores, setScores] = useState<Record<string, number>>(
    initialSnapshotValid ? initialProgress!.scores : {},
  );
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<string[]>(
    initialSnapshotValid ? initialProgress!.visitedNodes : [],
  );

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

  const navigateToNode = useCallback(
    (nodeId: string) => {
      if (nodeMap[nodeId]) {
        setCurrentNodeId(nodeId);
      }
    },
    [nodeMap],
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

  const prevSnapshotRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onProgressChange) return;
    const pkgId = packageId ?? loadedPackage.manifest.id;
    const pkgVer = packageVersion ?? loadedPackage.manifest.version;
    const snapshot = buildProgressSnapshot(pkgId, pkgVer, {
      currentNodeId,
      visitedNodes,
      scores,
      isCompleted,
    });
    const json = JSON.stringify(snapshot);
    if (json !== prevSnapshotRef.current) {
      prevSnapshotRef.current = json;
      onProgressChange(snapshot);
    }
  }, [
    currentNodeId,
    visitedNodes,
    scores,
    isCompleted,
    onProgressChange,
    loadedPackage.manifest.id,
    loadedPackage.manifest.version,
    packageId,
    packageVersion,
  ]);

  const skillScores = useMemo(() => computeSkillScores(scores, skillsRef.current), [scores]);

  const getContextSkillMastery = useCallback(
    (skillId: string): MasteryLevel => {
      const score = skillScores[skillId] ?? 0;
      const def = skillsRef.current?.skills.find((s) => s.id === skillId);
      return getSkillMastery(score, def);
    },
    [skillScores],
  );

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
      navigateToNode,
      getNode,
      widgetRegistry,
      skillScores,
      getSkillMastery: getContextSkillMastery,
      skillGraph,
      progressSnapshot: buildProgressSnapshot(
        packageId ?? loadedPackage.manifest.id,
        packageVersion ?? loadedPackage.manifest.version,
        { currentNodeId, visitedNodes, scores, isCompleted },
      ),
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
      navigateToNode,
      getNode,
      widgetRegistry,
      skillScores,
      getContextSkillMastery,
      skillGraph,
      packageId,
      packageVersion,
    ],
  );

  return (
    <RuntimeContext.Provider value={value}>
      <LiveRegionProvider>
        <WorkflowAnnouncer />
        {children}
      </LiveRegionProvider>
    </RuntimeContext.Provider>
  );
}

function WorkflowAnnouncer(): null {
  const { announce } = useLiveRegion();
  const { currentNodeId, currentNode, isCompleted } = useRuntime();
  const announcedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (currentNode && currentNodeId && !announcedRef.current.has(currentNodeId)) {
      announcedRef.current.add(currentNodeId);
      const title = (currentNode.node as { title?: string }).title ?? currentNode.relativePath;
      announce(`Now viewing: ${title}`);
    }
  }, [currentNodeId, currentNode, announce]);

  useEffect(() => {
    if (isCompleted) {
      announce('Lesson completed', 'assertive');
    }
  }, [isCompleted, announce]);

  return null;
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

export function useRuntimeOptional(): RuntimeContextValue | null {
  return useContext(RuntimeContext);
}
