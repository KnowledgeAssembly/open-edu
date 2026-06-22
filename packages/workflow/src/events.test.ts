import { describe, it, expect } from 'vitest';
import { createWorkflowEvent } from './events';

describe('createWorkflowEvent', () => {
  it('should create a node.entered event', () => {
    const event = createWorkflowEvent('node.entered', {
      nodeId: 'nodes/lesson-01.md',
    });
    expect(event.type).toBe('node.entered');
    expect(event.nodeId).toBe('nodes/lesson-01.md');
    expect(event.timestamp).toBeGreaterThan(0);
  });

  it('should create a workflow.completed event', () => {
    const event = createWorkflowEvent('workflow.completed', {});
    expect(event.type).toBe('workflow.completed');
  });

  it('should create a route.evaluated event with reason', () => {
    const event = createWorkflowEvent('route.evaluated', {
      nodeId: 'nodes/quiz-01.json',
      target: 'COMPLETED',
      score: 85,
      reason: 'score 85 >= 80',
    });
    expect(event.type).toBe('route.evaluated');
    expect(event.score).toBe(85);
    expect(event.reason).toBe('score 85 >= 80');
  });
});
