import { describe, it, expect } from 'vitest';
import {
  WORKFLOW_VERSION,
  WorkflowEngine,
  evaluateCondition,
  buildMachineConfig,
  createWorkflowEvent,
} from './index';

describe('@open-edu/workflow', () => {
  it('should export WORKFLOW_VERSION', () => {
    expect(WORKFLOW_VERSION).toBe('0.1.0');
  });

  it('should export all main exports', () => {
    expect(WorkflowEngine).toBeInstanceOf(Function);
    expect(evaluateCondition).toBeInstanceOf(Function);
    expect(buildMachineConfig).toBeInstanceOf(Function);
    expect(createWorkflowEvent).toBeInstanceOf(Function);
  });
});
