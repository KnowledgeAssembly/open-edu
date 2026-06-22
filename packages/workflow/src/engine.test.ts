import { describe, it, expect, vi } from 'vitest';
import { WorkflowEngine } from './engine';
import type { Workflow } from '@open-edu/schemas';

const simpleWorkflow: Workflow = {
  routing: {
    'nodes/lesson-01.md': {
      onComplete: 'nodes/quiz-01.json',
    },
    'nodes/quiz-01.json': {
      onComplete: 'COMPLETED',
    },
  },
};

const conditionalWorkflow: Workflow = {
  routing: {
    'nodes/quiz-01.json': {
      conditions: [
        { if: 'score >= 80', then: 'COMPLETED' },
        { if: 'score < 80', then: 'nodes/lesson-01.md' },
      ],
    },
    'nodes/lesson-01.md': {
      onComplete: 'nodes/quiz-01.json',
    },
  },
};

describe('WorkflowEngine', () => {
  describe('start / stop', () => {
    it('should start and return the initial node', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
      expect(engine.isCompleted()).toBe(false);
      engine.stop();
    });

    it('should stop without errors', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      engine.stop();
      expect(engine.getCurrentNodeId()).toBe('');
    });
  });

  describe('simple routing', () => {
    it('should transition to next node on completeNode', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');

      engine.completeNode();
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');
    });

    it('should reach COMPLETED state', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      engine.completeNode();
      engine.completeNode();
      expect(engine.isCompleted()).toBe(true);
    });
  });

  describe('conditional routing', () => {
    it('should route to COMPLETED when score passes', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');

      engine.completeNode(95);
      expect(engine.isCompleted()).toBe(true);
    });

    it('should route to remediation when score fails', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');

      engine.completeNode(50);
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
    });
  });

  describe('events / subscriptions', () => {
    it('should emit node.entered on start', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events: Array<{ type: string; nodeId?: string }> = [];
      engine.subscribe((e) => events.push(e));

      engine.start();

      expect(events.some((e) => e.type === 'node.entered')).toBe(true);
      engine.stop();
    });

    it('should emit node.entered and node.completed on completion', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events: Array<{ type: string }> = [];
      engine.subscribe((e) => events.push(e));
      engine.start();

      engine.completeNode();

      expect(events.some((e) => e.type === 'node.completed')).toBe(true);
      expect(events.some((e) => e.type === 'node.entered')).toBe(true);
      engine.stop();
    });

    it('should emit workflow.completed when finished', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events: Array<{ type: string }> = [];
      engine.subscribe((e) => events.push(e));
      engine.start();

      engine.completeNode();
      engine.completeNode();

      expect(events.some((e) => e.type === 'workflow.completed')).toBe(true);
      engine.stop();
    });

    it('should emit route.evaluated for conditional transitions', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      const events: Array<{ type: string }> = [];
      engine.subscribe((e) => events.push(e));
      engine.start();

      engine.completeNode(95);

      expect(events.some((e) => e.type === 'route.evaluated')).toBe(true);
      engine.stop();
    });

    it('should support unsubscribe', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const listener = vi.fn();
      const unsubscribe = engine.subscribe(listener);
      unsubscribe();

      engine.start();
      expect(listener).not.toHaveBeenCalled();
      engine.stop();
    });
  });

  describe('error handling', () => {
    it('should throw if completing before start', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      expect(() => engine.completeNode()).toThrow('not started');
    });

    it('should handle completing from unknown node', () => {
      const engine = new WorkflowEngine({ routing: {} } as Workflow);
      expect(() => engine.start()).toThrow('no routes');
    });
  });
});
