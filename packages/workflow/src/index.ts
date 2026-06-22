export const WORKFLOW_VERSION = '0.1.0';

export { WorkflowEngine } from './engine';
export { evaluateCondition } from './condition';
export { buildMachineConfig } from './builder';
export { createWorkflowEvent } from './events';
export { encodeStateName, decodeStateName } from './state-map';
export type { WorkflowEvent, WorkflowEventListener, WorkflowEventType } from './events';
export type { MachineConfig } from './types';
