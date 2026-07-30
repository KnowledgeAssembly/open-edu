import type {
  BundleManifest,
  BundleModuleRef,
  ModuleProgressSnapshot,
  Workflow,
} from '@open-edu/schemas';
import type { SkillGraph } from '@open-edu/schemas';
import { WorkflowEngine } from './engine.js';

export type ModuleStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';

export interface ModuleChangeEvent {
  type: 'module.changed';
  previousModuleId: string | null;
  currentModuleId: string;
}

export interface ModuleCompletedEvent {
  type: 'module.completed';
  moduleId: string;
}

export interface BundleCompletedEvent {
  type: 'bundle.completed';
}

export interface ModuleUnlockedEvent {
  type: 'module.unlocked';
  moduleId: string;
}

export type BundleEngineEvent =
  | ModuleChangeEvent
  | ModuleCompletedEvent
  | BundleCompletedEvent
  | ModuleUnlockedEvent;

export type BundleEngineEventListener = (event: BundleEngineEvent) => void;

export interface BundleEngineOptions {
  entry?: string;
  moduleSnapshots?: Record<string, ModuleProgressSnapshot>;
  skillGraph?: SkillGraph;
}

export interface BundleModulePackage {
  manifest: { id: string; version: string };
  workflow: Workflow | null;
}

export interface BundleInput {
  rootDir: string;
  manifest: BundleManifest;
  modules: BundleModulePackage[];
  moduleMap: Map<string, BundleModulePackage>;
}

export class BundleEngine {
  private bundleInput: BundleInput;
  private engineMap: Map<string, WorkflowEngine>;
  private currentModuleId: string | null = null;
  private moduleStatuses: Record<string, ModuleStatus>;
  private listeners: BundleEngineEventListener[] = [];
  private moduleSubscriptions: Map<string, () => void>;
  private moduleSnapshots: Record<string, ModuleProgressSnapshot>;
  private skillGraph?: SkillGraph;
  private reverseDeps: Map<string, string[]>;
  private completedModuleIds: Set<string>;

  constructor(bundleInput: BundleInput, options?: BundleEngineOptions) {
    this.bundleInput = bundleInput;
    this.engineMap = new Map();
    this.moduleSubscriptions = new Map();
    this.moduleSnapshots = options?.moduleSnapshots ?? {};
    this.skillGraph = options?.skillGraph;
    this.reverseDeps = new Map();
    this.completedModuleIds = new Set<string>();

    if (bundleInput.manifest.rewards) {
      console.warn(
        `[BundleEngine] Bundle "${bundleInput.manifest.id}" has rewards configured, but ` +
          'bundle-level reward evaluation requires external wiring via updateContext().',
      );
    }

    this.moduleStatuses = {};
    for (const modRef of bundleInput.manifest.modules) {
      const existingSnapshot = this.moduleSnapshots[modRef.id];
      if (existingSnapshot?.isCompleted) {
        this.moduleStatuses[modRef.id] = 'completed';
        this.completedModuleIds.add(modRef.id);
      } else if (existingSnapshot && existingSnapshot.currentNodeId) {
        this.moduleStatuses[modRef.id] = 'in_progress';
      } else {
        this.moduleStatuses[modRef.id] = 'unlocked';
      }
    }

    const moduleIds = new Set(bundleInput.manifest.modules.map((m) => m.id));
    for (const modRef of bundleInput.manifest.modules) {
      for (const depId of modRef.dependsOn) {
        if (!moduleIds.has(depId)) {
          throw new Error(`Module "${modRef.id}" depends on "${depId}" which is not in the bundle`);
        }
        const dependents = this.reverseDeps.get(depId) ?? [];
        dependents.push(modRef.id);
        this.reverseDeps.set(depId, dependents);
      }
    }
  }

  start(moduleId?: string): void {
    const targetId = moduleId ?? this.findFirstUnlocked();
    if (!targetId) {
      throw new Error('No unlocked module available to start');
    }

    this.snapshotActiveModule();

    const previousModuleId = this.currentModuleId;

    const pkg = this.bundleInput.moduleMap.get(targetId);
    if (!pkg) {
      throw new Error(`Module "${targetId}" not found in bundle`);
    }
    if (!pkg.workflow) {
      throw new Error(`Module "${targetId}" has no workflow defined`);
    }

    const snapshot = this.moduleSnapshots[targetId];
    const engine = new WorkflowEngine(pkg.workflow, {
      entry: snapshot?.currentNodeId ?? undefined,
      skillGraph: this.skillGraph,
    });

    const unsub = engine.subscribe((event) => {
      if (event.type === 'workflow.completed') {
        this.handleModuleCompleted(targetId);
      }
    });

    const prevUnsub = this.moduleSubscriptions.get(targetId);
    if (prevUnsub) prevUnsub();
    this.moduleSubscriptions.set(targetId, unsub);

    const prevEngine = this.engineMap.get(targetId);
    if (prevEngine) prevEngine.stop();

    this.engineMap.set(targetId, engine);
    engine.start();
    this.currentModuleId = targetId;

    if (this.moduleStatuses[targetId] === 'unlocked') {
      this.moduleStatuses[targetId] = 'in_progress';
    }

    if (previousModuleId !== targetId) {
      this.fireEvent({
        type: 'module.changed',
        previousModuleId,
        currentModuleId: targetId,
      });
    }
  }

  stop(): void {
    this.snapshotActiveModule();

    if (this.currentModuleId) {
      const engine = this.engineMap.get(this.currentModuleId);
      if (engine) {
        engine.stop();
      }
      const unsub = this.moduleSubscriptions.get(this.currentModuleId);
      if (unsub) {
        unsub();
        this.moduleSubscriptions.delete(this.currentModuleId);
      }
    }

    this.currentModuleId = null;
  }

  getCurrentModuleId(): string | null {
    return this.currentModuleId;
  }

  getCurrentEngine(): WorkflowEngine | null {
    if (!this.currentModuleId) return null;
    return this.engineMap.get(this.currentModuleId) ?? null;
  }

  getModuleStatus(moduleId: string): ModuleStatus {
    return this.moduleStatuses[moduleId] ?? 'locked';
  }

  getModuleStatuses(): Record<string, ModuleStatus> {
    return { ...this.moduleStatuses };
  }

  getModuleSnapshot(moduleId: string): ModuleProgressSnapshot | null {
    return this.moduleSnapshots[moduleId] ?? null;
  }

  getCompletedModuleIds(): string[] {
    return [...this.completedModuleIds];
  }

  isCompleted(): boolean {
    return this.bundleInput.manifest.modules.every(
      (m) => this.moduleStatuses[m.id] === 'completed',
    );
  }

  switchModule(moduleId: string): void {
    if (moduleId === this.currentModuleId) return;

    if (!this.bundleInput.moduleMap.has(moduleId)) {
      throw new Error(`Module "${moduleId}" not found in bundle`);
    }

    this.snapshotActiveModule();
    if (this.currentModuleId) {
      const engine = this.engineMap.get(this.currentModuleId);
      if (engine) {
        engine.stop();
      }
      const unsub = this.moduleSubscriptions.get(this.currentModuleId);
      if (unsub) {
        unsub();
        this.moduleSubscriptions.delete(this.currentModuleId);
      }
    }

    this.start(moduleId);
  }

  subscribe(listener: BundleEngineEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private findFirstUnlocked(): string | undefined {
    const visited = new Set<string>();
    const result: string[] = [];

    function dfs(id: string, modules: BundleModuleRef[], stack: Set<string>): void {
      if (visited.has(id)) return;
      if (stack.has(id)) return;
      stack.add(id);
      const modRef = modules.find((m) => m.id === id);
      if (modRef) {
        for (const depId of modRef.dependsOn) {
          dfs(depId, modules, stack);
        }
      }
      stack.delete(id);
      visited.add(id);
      result.push(id);
    }

    const allIds = this.bundleInput.manifest.modules.map((m) => m.id);
    for (const id of allIds) {
      dfs(id, this.bundleInput.manifest.modules, new Set());
    }

    const inProgress: string[] = [];
    const unlocked: string[] = [];

    for (const id of result) {
      const status = this.moduleStatuses[id];
      if (status === 'in_progress') {
        inProgress.push(id);
      } else if (status === 'unlocked') {
        unlocked.push(id);
      }
    }

    return inProgress[0] ?? unlocked[0] ?? undefined;
  }

  private handleModuleCompleted(moduleId: string): void {
    this.moduleStatuses[moduleId] = 'completed';
    this.completedModuleIds.add(moduleId);
    this.moduleSnapshots[moduleId] = {
      moduleId,
      packageVersion: this.bundleInput.moduleMap.get(moduleId)?.manifest?.version ?? '0.0.0',
      currentNodeId: '',
      visitedNodes: [],
      scores: {},
      answers: {},
      isCompleted: true,
      completedAt: new Date().toISOString(),
    };

    this.fireEvent({ type: 'module.completed', moduleId });

    if (this.isCompleted()) {
      this.fireEvent({ type: 'bundle.completed' });
    }
  }

  private snapshotActiveModule(): void {
    if (!this.currentModuleId) return;

    const engine = this.engineMap.get(this.currentModuleId);
    if (!engine) return;

    const currentNodeId = engine.getCurrentNodeId();
    const existing = this.moduleSnapshots[this.currentModuleId];

    // Engine is stopped (actor null). Existing snapshot is more accurate.
    if (!currentNodeId && existing) return;

    const isCompleted = engine.isCompleted();
    const existingVisited = existing?.visitedNodes ?? [];

    this.moduleSnapshots[this.currentModuleId] = {
      moduleId: this.currentModuleId,
      packageVersion:
        this.bundleInput.moduleMap.get(this.currentModuleId)?.manifest?.version ?? '0.0.0',
      currentNodeId,
      visitedNodes: currentNodeId
        ? [...new Set([...existingVisited, currentNodeId])]
        : existingVisited,
      scores: {},
      answers: existing?.answers ?? {},
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
    };
  }

  private fireEvent(event: BundleEngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // silently handle listener errors
      }
    }
  }
}
