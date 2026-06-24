import type { ProgressSnapshot } from '@open-edu/schemas';

export function buildProgressSnapshot(
  packageId: string,
  packageVersion: string,
  workflowSnapshot: {
    currentNodeId: string;
    visitedNodes: string[];
    scores: Record<string, number>;
    isCompleted: boolean;
  },
): ProgressSnapshot {
  return {
    packageId,
    packageVersion,
    currentNodeId: workflowSnapshot.currentNodeId,
    visitedNodes: workflowSnapshot.visitedNodes,
    scores: workflowSnapshot.scores ?? {},
    isCompleted: workflowSnapshot.isCompleted,
    updatedAt: new Date().toISOString(),
  };
}

export function isValidSnapshot(
  snapshot: ProgressSnapshot,
  validNodeIds: Set<string>,
): boolean {
  if (snapshot.isCompleted) return true;
  return validNodeIds.has(snapshot.currentNodeId);
}
