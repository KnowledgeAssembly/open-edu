import type { Workflow, RouteDefinition } from '@open-edu/schemas';
import { evaluateCondition } from './condition';
import { encodeStateName } from './state-map';
import type { MachineConfig } from './types';

const COMPLETED_STATE = 'COMPLETED';

export interface BuildMachineOptions {
  entry?: string;
}

function buildStateOnDefinition(definition: RouteDefinition): Record<string, unknown> {
  if ('onComplete' in definition && definition.onComplete !== undefined) {
    const target =
      definition.onComplete === COMPLETED_STATE
        ? COMPLETED_STATE
        : encodeStateName(definition.onComplete);
    return {
      NODE_COMPLETE: {
        target,
      },
    };
  }

  if ('conditions' in definition && definition.conditions) {
    const guardedTransitions = definition.conditions.map((cond) => {
      const target = cond.then === COMPLETED_STATE ? COMPLETED_STATE : encodeStateName(cond.then);
      return {
        guard: (params: { event: Record<string, unknown> }) => {
          const score = (params.event.score as number) ?? 0;
          return evaluateCondition(cond.if, score).match;
        },
        target,
      };
    });

    return {
      EVALUATE: guardedTransitions,
    };
  }

  return {};
}

export function buildMachineConfig(
  workflow: Workflow,
  options?: BuildMachineOptions,
): MachineConfig {
  const states: Record<string, Record<string, unknown>> = {};

  for (const [routePath, definition] of Object.entries(workflow.routing)) {
    const encoded = encodeStateName(routePath);
    states[encoded] = {
      on: buildStateOnDefinition(definition),
    };
  }

  states[COMPLETED_STATE] = { type: 'final' };

  const routingKeys = Object.keys(workflow.routing);
  const entry = options?.entry ?? routingKeys[0];

  if (!entry) {
    throw new Error('Workflow has no routes defined');
  }

  if (!(entry in workflow.routing)) {
    throw new Error(
      `Entry node "${entry}" is not present in workflow routing. Available routes: ${routingKeys.join(', ')}`,
    );
  }

  return {
    id: 'workflow',
    initial: encodeStateName(entry),
    states,
  } as MachineConfig;
}
