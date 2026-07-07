import { describe, it, expect, vi } from 'vitest';
import { BundleEngine, type BundleModulePackage, type BundleEngineEvent } from './bundle-engine.js';
import type { BundleManifest } from '@open-edu/schemas';
import type { Workflow } from '@open-edu/schemas';

function createMockModule(
  id: string,
  version = '1.0.0',
  workflow?: Workflow | null,
): BundleModulePackage {
  return {
    manifest: { id, version },
    workflow: workflow ?? {
      routing: {
        'nodes/lesson.md': { onComplete: 'COMPLETED' },
      },
    },
  };
}

function createMockBundle(modules: Array<{ id: string; title: string; dependsOn?: string[] }>) {
  const manifest: BundleManifest = {
    type: 'bundle',
    id: 'test-bundle',
    title: 'Test Bundle',
    version: '1.0.0',
    author: 'Test',
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      path: `./modules/${m.id}`,
      dependsOn: m.dependsOn ?? [],
    })),
  };

  const moduleList = modules.map((m) => createMockModule(m.id));
  const moduleMap = new Map(moduleList.map((m) => [m.manifest.id, m]));

  return { rootDir: '/test', manifest, modules: moduleList, moduleMap };
}

describe('BundleEngine', () => {
  describe('constructor', () => {
    it('should accept a LoadedBundle and initialize module statuses', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
      ]);
      const engine = new BundleEngine(bundle);
      expect(engine.getModuleStatus('mod-a')).toBe('unlocked');
      expect(engine.getModuleStatus('mod-b')).toBe('unlocked');
    });

    it('should set locked status for modules with dependsOn', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      expect(engine.getModuleStatus('mod-a')).toBe('unlocked');
      expect(engine.getModuleStatus('mod-b')).toBe('locked');
    });

    it('should throw for unknown dependsOn references', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A', dependsOn: ['nonexistent'] },
      ]);
      expect(() => new BundleEngine(bundle)).toThrow('nonexistent');
    });

    it('should restore statuses from snapshots', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle, {
        moduleSnapshots: {
          'mod-b': {
            moduleId: 'mod-b',
            packageVersion: '1.0.0',
            currentNodeId: 'nodes/lesson.md',
            visitedNodes: ['nodes/lesson.md'],
            scores: {},
            answers: {},
            isCompleted: false,
          },
        },
      });
      expect(engine.getModuleStatus('mod-b')).toBe('in_progress');
    });

    it('should restore completed status from snapshot', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle, {
        moduleSnapshots: {
          'mod-a': {
            moduleId: 'mod-a',
            packageVersion: '1.0.0',
            currentNodeId: '',
            visitedNodes: ['nodes/lesson.md'],
            scores: {},
            answers: {},
            isCompleted: true,
            completedAt: '2024-01-01T00:00:00.000Z',
          },
        },
      });
      expect(engine.getModuleStatus('mod-a')).toBe('completed');
    });
  });

  describe('start', () => {
    it('should create a WorkflowEngine for the first unlocked module', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      engine.start();
      expect(engine.getCurrentModuleId()).toBe('mod-a');
      expect(engine.getCurrentEngine()).not.toBeNull();
    });

    it('should throw if starting a locked module', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      expect(() => engine.start('mod-b')).toThrow('locked');
    });

    it('should fire module.changed event on start', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine.start('mod-a');
      expect(events.some((e) => e.type === 'module.changed')).toBe(true);
    });

    it('should throw when no unlocked modules exist', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A', dependsOn: ['mod-b'] },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      expect(() => engine.start()).toThrow('No unlocked module available');
    });

    it('should throw when module has no workflow', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      bundle.moduleMap.get('mod-a')!.workflow = null;
      const engine = new BundleEngine(bundle);
      expect(() => engine.start('mod-a')).toThrow('has no workflow');
    });
  });

  describe('switchModule', () => {
    it('should switch to another unlocked module', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
      ]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine.switchModule('mod-b');
      expect(engine.getCurrentModuleId()).toBe('mod-b');
      expect(
        events.some(
          (e) =>
            e.type === 'module.changed' &&
            e.previousModuleId === 'mod-a' &&
            e.currentModuleId === 'mod-b',
        ),
      ).toBe(true);
    });

    it('should be a no-op when switching to current module', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine.switchModule('mod-a');
      expect(events.filter((e) => e.type === 'module.changed')).toHaveLength(0);
    });

    it('should throw when switching to a locked module', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      expect(() => engine.switchModule('mod-b')).toThrow('locked');
    });

    it('should throw when switching to a nonexistent module', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      expect(() => engine.switchModule('nonexistent')).toThrow('not found');
    });
  });

  describe('evaluatePrerequisites', () => {
    it('should unlock dependent modules after completion', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      expect(engine.getModuleStatus('mod-b')).toBe('locked');

      engine['handleModuleCompleted']('mod-a');
      expect(engine.getModuleStatus('mod-b')).toBe('unlocked');
    });

    it('should not unlock modules with multiple unmet dependencies', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
        { id: 'mod-c', title: 'Module C', dependsOn: ['mod-a', 'mod-b'] },
      ]);
      const engine = new BundleEngine(bundle);
      engine['handleModuleCompleted']('mod-a');
      expect(engine.getModuleStatus('mod-c')).toBe('locked');
    });

    it('should unlock when all dependencies are met', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
        { id: 'mod-c', title: 'Module C', dependsOn: ['mod-a', 'mod-b'] },
      ]);
      const engine = new BundleEngine(bundle);
      engine['handleModuleCompleted']('mod-a');
      engine['handleModuleCompleted']('mod-b');
      expect(engine.getModuleStatus('mod-c')).toBe('unlocked');
    });
  });

  describe('isCompleted', () => {
    it('should return false initially', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      expect(engine.isCompleted()).toBe(false);
    });

    it('should return true after all modules complete', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
      ]);
      const engine = new BundleEngine(bundle);
      engine['handleModuleCompleted']('mod-a');
      engine['handleModuleCompleted']('mod-b');
      expect(engine.isCompleted()).toBe(true);
    });
  });

  describe('events', () => {
    it('should fire module.completed when a module completes', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine['handleModuleCompleted']('mod-a');
      expect(events.some((e) => e.type === 'module.completed' && e.moduleId === 'mod-a')).toBe(
        true,
      );
    });

    it('should fire bundle.completed when all modules are done', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B' },
      ]);
      const engine = new BundleEngine(bundle);
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine['handleModuleCompleted']('mod-a');
      engine['handleModuleCompleted']('mod-b');
      const bundleCompleted = events.filter((e) => e.type === 'bundle.completed');
      expect(bundleCompleted).toHaveLength(1);
    });

    it('should fire module.unlocked when prerequisites are met', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      const events: BundleEngineEvent[] = [];
      engine.subscribe((e) => events.push(e));
      engine['handleModuleCompleted']('mod-a');
      expect(events.some((e) => e.type === 'module.unlocked' && e.moduleId === 'mod-b')).toBe(true);
    });

    it('should support unsubscribe', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      const listener = vi.fn();
      const unsub = engine.subscribe(listener);
      unsub();
      engine['handleModuleCompleted']('mod-a');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop the active engine and clear state', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      expect(engine.getCurrentModuleId()).toBe('mod-a');
      engine.stop();
      expect(engine.getCurrentModuleId()).toBeNull();
      expect(engine.getCurrentEngine()).toBeNull();
    });

    it('should snapshot active module before stopping', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      engine.start('mod-a');
      engine.stop();
      const snapshot = engine.getModuleSnapshot('mod-a');
      expect(snapshot).not.toBeNull();
      expect(snapshot!.moduleId).toBe('mod-a');
    });

    it('should be safe to call stop when not started', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      expect(() => engine.stop()).not.toThrow();
    });
  });

  describe('getModuleSnapshot', () => {
    it('should return null for unknown module', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      expect(engine.getModuleSnapshot('nonexistent')).toBeNull();
    });

    it('should return snapshot if one was provided', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const snapshot = {
        moduleId: 'mod-a',
        packageVersion: '1.0.0',
        currentNodeId: 'nodes/lesson.md',
        visitedNodes: ['nodes/lesson.md'],
        scores: {},
        answers: {},
        isCompleted: false,
      };
      const engine = new BundleEngine(bundle, {
        moduleSnapshots: { 'mod-a': snapshot },
      });
      expect(engine.getModuleSnapshot('mod-a')).toEqual(snapshot);
    });
  });

  describe('getModuleStatuses', () => {
    it('should return a copy of all module statuses', () => {
      const bundle = createMockBundle([
        { id: 'mod-a', title: 'Module A' },
        { id: 'mod-b', title: 'Module B', dependsOn: ['mod-a'] },
      ]);
      const engine = new BundleEngine(bundle);
      const statuses = engine.getModuleStatuses();
      expect(statuses).toEqual({
        'mod-a': 'unlocked',
        'mod-b': 'locked',
      });
    });

    it('returned object should not be mutable by caller', () => {
      const bundle = createMockBundle([{ id: 'mod-a', title: 'Module A' }]);
      const engine = new BundleEngine(bundle);
      const statuses = engine.getModuleStatuses();
      statuses['mod-a'] = 'completed';
      expect(engine.getModuleStatus('mod-a')).toBe('unlocked');
    });
  });
});
