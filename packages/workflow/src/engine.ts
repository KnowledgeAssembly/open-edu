import { createMachine, interpret } from 'xstate';
import { buildMachineConfig } from './builder';
import { evaluateCondition } from './condition';
import { decodeStateName } from './state-map';
import { createWorkflowEvent } from './events';
import type { WorkflowEvent, WorkflowEventListener } from './events';
import type { Workflow, RouteDefinition } from '@open-edu/schemas';

export class WorkflowEngine {
  private actor: ReturnType<typeof interpret> | null = null;
  private workflow: Workflow;
  private listeners: WorkflowEventListener[] = [];
  private nodePaths: string[];

  constructor(workflow: Workflow) {
    this.workflow = workflow;
    this.nodePaths = Object.keys(workflow.routing);
  }

  start(): void {
    const config = buildMachineConfig(this.workflow);
    const machine = createMachine(config);
    const actor = interpret(machine).start();
    this.actor = actor;

    this.emit(
      createWorkflowEvent('node.entered', {
        nodeId: String(actor.getSnapshot().value),
      }),
    );
  }

  stop(): void {
    this.actor?.stop();
    this.actor = null;
  }

  getCurrentNodeId(): string {
    if (!this.actor) return '';
    return decodeStateName(String(this.actor.getSnapshot().value), this.nodePaths);
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
      const newNode = this.getCurrentNodeId();
      this.emit(createWorkflowEvent('node.entered', { nodeId: newNode }));
      if (newNode === 'COMPLETED') {
        this.emit(createWorkflowEvent('workflow.completed', {}));
      }
    }
  }

  private evaluateConditionalRoute(routeDef: RouteDefinition, score?: number): void {
    if (!('conditions' in routeDef) || !routeDef.conditions) return;

    const s = score ?? 0;
    const actor = this.actor!;

    for (const cond of routeDef.conditions) {
      const result = evaluateCondition(cond.if, s);
      if (result.match) {
        const prevNode = this.getCurrentNodeId();
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
        const newNode = this.getCurrentNodeId();
        this.emit(createWorkflowEvent('node.entered', { nodeId: newNode }));
        if (newNode === 'COMPLETED') {
          this.emit(createWorkflowEvent('workflow.completed', {}));
        }
        return;
      }
    }
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
