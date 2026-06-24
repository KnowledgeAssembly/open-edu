export type WorkflowEventType =
  | 'node.entered'
  | 'node.completed'
  | 'workflow.completed'
  | 'route.evaluated'
  | 'SKILL_UPDATED'
  | 'SKILL_ACHIEVED';

export interface WorkflowEvent {
  type: WorkflowEventType;
  nodeId?: string;
  target?: string;
  score?: number;
  reason?: string;
  timestamp: number;
  skillId?: string;
  accumulatedScore?: number;
  maxScore?: number;
  masteryLevel?: string;
}

export type WorkflowEventListener = (event: WorkflowEvent) => void;

export function createWorkflowEvent(
  type: WorkflowEventType,
  data: Omit<WorkflowEvent, 'type' | 'timestamp'>,
): WorkflowEvent {
  return {
    type,
    timestamp: Date.now(),
    ...data,
  };
}
