import { createMachine, interpret } from 'xstate';
import { buildMachineConfig } from './builder.js';
import { evaluateCondition } from './condition.js';
import { decodeStateName } from './state-map.js';
import { createWorkflowEvent } from './events.js';
import type { WorkflowEvent, WorkflowEventListener } from './events.js';
import type { Workflow, RouteDefinition } from '@open-edu/schemas';

const COMPLETED_STATE = 'COMPLETED';

export interface WorkflowEngineOptions {
  entry?: string;
}

export class WorkflowEngine {
  private actor: ReturnType<typeof interpret> | null = null;
  private workflow: Workflow;
  private listeners: WorkflowEventListener[] = [];
  private entry: string;

  constructor(workflow: Workflow, options?: WorkflowEngineOptions) {
    this.workflow = workflow;
    const firstKey = Object.keys(workflow.routing)[0];
    const entry = options?.entry ?? firstKey;
    if (!entry) {
      throw new Error('Workflow has no routes defined');
    }
    if (!(entry in workflow.routing)) {
      throw new Error(`Entry node "${entry}" is not present in workflow routing.`);
    }
    this.entry = entry;
  }

  start(): void {
    const config = buildMachineConfig(this.workflow, { entry: this.entry });
    const machine = createMachine(config);
    const actor = interpret(machine).start();
    this.actor = actor;

    this.emit(
      createWorkflowEvent('node.entered', {
        nodeId: this.getCurrentNodeId(),
      }),
    );
  }

  stop(): void {
    this.actor?.stop();
    this.actor = null;
    this.listeners = [];
  }

  getCurrentNodeId(): string {
    if (!this.actor) return '';
    return decodeStateName(String(this.actor.getSnapshot().value));
  }

  isCompleted(): boolean {
    if (!this.actor) return false;
    return this.actor.getSnapshot().status === 'done';
  }

  completeNode(score?: number): void {
    if (!this.actor) {
      throw new Error('Workflow engine not started. Call start() first.');
    }

    const currentNode = this.getCurrentNodeId();
    const routeDef = this.workflow.routing[currentNode];

    if (!routeDef) {
      throw new Error(`No route definition found for node: ${currentNode}`);
    }

    if ('conditions' in routeDef && routeDef.conditions) {
      this.evaluateConditionalRoute(routeDef, score);
      return;
    }

    if ('onComplete' in routeDef && routeDef.onComplete) {
      const prevNode = this.getCurrentNodeId();
      this.emit(createWorkflowEvent('node.completed', { nodeId: prevNode, score }));
      this.actor.send({ type: 'NODE_COMPLETE' });
      this.emitEnteredOrCompleted();
    }
  }

  private evaluateConditionalRoute(routeDef: RouteDefinition, score?: number): void {
    if (!('conditions' in routeDef) || !routeDef.conditions) return;

    const s = score ?? 0;
    const actor = this.actor!;
    const prevNode = this.getCurrentNodeId();

    for (const cond of routeDef.conditions) {
      const result = evaluateCondition(cond.if, s);
      if (result.match) {
        this.emit(
          createWorkflowEvent('node.completed', {
            nodeId: prevNode,
            score: s,
          }),
        );
        this.emit(
          createWorkflowEvent('route.evaluated', {
            nodeId: prevNode,
            target: cond.then,
            score: s,
            reason: result.reason,
          }),
        );
        actor.send({ type: 'EVALUATE', score: s });
        this.emitEnteredOrCompleted();
        return;
      }
    }

    this.emit(
      createWorkflowEvent('route.evaluated', {
        nodeId: prevNode,
        score: s,
        reason: `No condition matched for score ${s}`,
      }),
    );
    this.emit(
      createWorkflowEvent('node.completed', {
        nodeId: prevNode,
        score: s,
      }),
    );
  }

  private emitEnteredOrCompleted(): void {
    const newNode = this.getCurrentNodeId();
    if (newNode === COMPLETED_STATE) {
      this.emit(createWorkflowEvent('workflow.completed', {}));
      return;
    }
    this.emit(createWorkflowEvent('node.entered', { nodeId: newNode }));
  }

  subscribe(listener: WorkflowEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(event: WorkflowEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Silently handle listener errors
      }
    }
  }
}
