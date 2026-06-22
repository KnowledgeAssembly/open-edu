import { describe, it, expect, vi } from 'vitest';
import { WorkflowEngine } from './engine';
import type { Workflow } from '@open-edu/schemas';
import type { WorkflowEvent, WorkflowEventListener } from './events';

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

function captureEvents(engine: WorkflowEngine): WorkflowEvent[] {
  const events: WorkflowEvent[] = [];
  engine.subscribe((e) => events.push(e));
  return events;
}

function types(events: WorkflowEvent[]): string[] {
  return events.map((e) => e.type);
}

describe('WorkflowEngine', () => {
  describe('start / stop', () => {
    it('should start and return the initial node', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
      expect(engine.isCompleted()).toBe(false);
      engine.stop();
    });

    it('should stop without errors and clear listeners', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const listener = vi.fn();
      engine.subscribe(listener);
      engine.start();
      engine.stop();
      expect(engine.getCurrentNodeId()).toBe('');
      expect(listener).toHaveBeenCalledTimes(1);
      engine.start();
      expect(listener).toHaveBeenCalledTimes(1);
      engine.stop();
    });

    it('emits node.entered on start with the DECODED node id (not the encoded XState key)', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events = captureEvents(engine);
      engine.start();
      const entered = events.filter((e) => e.type === 'node.entered');
      expect(entered).toHaveLength(1);
      expect(entered[0]?.nodeId).toBe('nodes/lesson-01.md');
      engine.stop();
    });

    it('does not emit node.entered for the COMPLETED sentinel', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events = captureEvents(engine);
      engine.start();
      engine.completeNode();
      engine.completeNode();
      const entered = events.filter((e) => e.type === 'node.entered');
      const completed = events.filter((e) => e.type === 'workflow.completed');
      expect(entered.map((e) => e.nodeId)).toEqual(['nodes/lesson-01.md', 'nodes/quiz-01.json']);
      expect(completed).toHaveLength(1);
      engine.stop();
    });
  });

  describe('simple routing', () => {
    it('should transition to next node on completeNode', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
      engine.completeNode();
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');
      engine.stop();
    });

    it('should reach COMPLETED state', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      engine.start();
      engine.completeNode();
      engine.completeNode();
      expect(engine.isCompleted()).toBe(true);
      engine.stop();
    });

    it('emits node.completed then node.entered in order for a simple transition', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events = captureEvents(engine);
      engine.start();
      events.length = 0;
      engine.completeNode();
      expect(types(events)).toEqual(['node.completed', 'node.entered']);
      expect(events[0]?.nodeId).toBe('nodes/lesson-01.md');
      expect(events[1]?.nodeId).toBe('nodes/quiz-01.json');
      engine.stop();
    });
  });

  describe('conditional routing', () => {
    it('should route to COMPLETED when score passes', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');
      engine.completeNode(95);
      expect(engine.isCompleted()).toBe(true);
      engine.stop();
    });

    it('should route to remediation when score fails', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      engine.start();
      engine.completeNode(50);
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
      engine.stop();
    });

    it('emits node.completed, route.evaluated, node.entered in order on a matching conditional', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      const events = captureEvents(engine);
      engine.start();
      events.length = 0;
      engine.completeNode(50);
      expect(types(events)).toEqual(['node.completed', 'route.evaluated', 'node.entered']);
      expect(events[0]?.nodeId).toBe('nodes/quiz-01.json');
      expect(events[0]?.score).toBe(50);
      expect(events[1]?.target).toBe('nodes/lesson-01.md');
      expect(events[2]?.nodeId).toBe('nodes/lesson-01.md');
      engine.stop();
    });

    it('emits route.evaluated with a target of COMPLETED and a workflow.completed on pass', () => {
      const engine = new WorkflowEngine(conditionalWorkflow);
      const events = captureEvents(engine);
      engine.start();
      events.length = 0;
      engine.completeNode(95);
      expect(events[0]?.type).toBe('node.completed');
      expect(events[1]?.type).toBe('route.evaluated');
      expect(events[1]?.target).toBe('COMPLETED');
      expect(events[2]?.type).toBe('workflow.completed');
      const entered = events.filter((e) => e.type === 'node.entered');
      expect(entered).toHaveLength(0);
      engine.stop();
    });

    it('emits route.evaluated with no target and node.completed when no condition matches', () => {
      const workflow: Workflow = {
        routing: {
          'nodes/quiz-01.json': {
            conditions: [{ if: 'score >= 80', then: 'COMPLETED' }],
          },
        },
      };
      const engine = new WorkflowEngine(workflow);
      const events = captureEvents(engine);
      engine.start();
      events.length = 0;
      engine.completeNode(50);
      const evaluated = events.filter((e) => e.type === 'route.evaluated');
      const completed = events.filter((e) => e.type === 'node.completed');
      const entered = events.filter((e) => e.type === 'node.entered');
      expect(evaluated).toHaveLength(1);
      expect(evaluated[0]?.target).toBeUndefined();
      expect(evaluated[0]?.score).toBe(50);
      expect(evaluated[0]?.reason).toContain('No condition matched');
      expect(completed).toHaveLength(1);
      expect(entered).toHaveLength(0);
      expect(engine.getCurrentNodeId()).toBe('nodes/quiz-01.json');
      engine.stop();
    });
  });

  describe('events / subscriptions', () => {
    it('should emit workflow.completed when finished', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events = captureEvents(engine);
      engine.start();
      engine.completeNode();
      engine.completeNode();
      expect(events.some((e) => e.type === 'workflow.completed')).toBe(true);
      engine.stop();
    });

    it('should support unsubscribe', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const listener = vi.fn() as unknown as WorkflowEventListener;
      const unsubscribe = engine.subscribe(listener);
      unsubscribe();
      engine.start();
      expect(listener).not.toHaveBeenCalled();
      engine.stop();
    });

    it('subscribe before start receives the initial node.entered (sync emit)', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      const events = captureEvents(engine);
      engine.start();
      expect(events[0]?.type).toBe('node.entered');
      expect(events[0]?.nodeId).toBe('nodes/lesson-01.md');
      engine.stop();
    });
  });

  describe('error handling', () => {
    it('should throw if completing before start', () => {
      const engine = new WorkflowEngine(simpleWorkflow);
      expect(() => engine.completeNode()).toThrow('not started');
    });

    it('throws at construction time for an empty workflow', () => {
      expect(() => new WorkflowEngine({ routing: {} } as Workflow)).toThrow('no routes');
    });

    it('throws at start time if entry is not a routing key', () => {
      expect(() => new WorkflowEngine(simpleWorkflow, { entry: 'nodes/GHOST.md' })).toThrow(
        'not present in workflow routing',
      );
    });
  });

  describe('entry option', () => {
    it('uses the supplied entry as the initial node instead of the first route key', () => {
      const engine = new WorkflowEngine(conditionalWorkflow, {
        entry: 'nodes/lesson-01.md',
      });
      engine.start();
      expect(engine.getCurrentNodeId()).toBe('nodes/lesson-01.md');
      engine.stop();
    });

    it('emits node.entered for the supplied entry on start', () => {
      const engine = new WorkflowEngine(conditionalWorkflow, {
        entry: 'nodes/lesson-01.md',
      });
      const events = captureEvents(engine);
      engine.start();
      expect(events[0]?.type).toBe('node.entered');
      expect(events[0]?.nodeId).toBe('nodes/lesson-01.md');
      engine.stop();
    });
  });
});
