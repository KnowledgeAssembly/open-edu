export const WORKFLOW_VERSION = '0.1.0';

export { WorkflowEngine } from './engine.js';
export type { WorkflowEngineOptions } from './engine.js';
export { evaluateCondition } from './condition.js';
export { buildMachineConfig } from './builder.js';
export type { BuildMachineOptions } from './builder.js';
export { createWorkflowEvent } from './events.js';
export { encodeStateName, decodeStateName } from './state-map.js';
export type { WorkflowEvent, WorkflowEventListener, WorkflowEventType } from './events.js';
export type { MachineConfig } from './types.js';
export { createSkillState, applyAssessment } from './skills.js';
export type {
  SkillState,
  MasteryLevel,
  SkillUpdatedEvent,
  SkillAchievedEvent,
  SkillEvent,
} from './skills.js';
