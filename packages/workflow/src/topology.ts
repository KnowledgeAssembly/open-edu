import type { Workflow } from '@open-edu/schemas';

export function getOrderedNodes(workflow: Workflow, entry: string): string[] {
  if (entry === '') {
    return [];
  }

  const visited = new Set<string>();
  const result: string[] = [];
  const queue: string[] = [entry];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);
    result.push(nodeId);

    const route = workflow.routing[nodeId];
    if (!route) {
      continue;
    }

    if (route.onComplete && route.onComplete !== 'COMPLETED') {
      queue.push(route.onComplete);
    } else if (route.conditions) {
      for (const condition of route.conditions) {
        if (condition.then !== 'COMPLETED') {
          queue.push(condition.then);
        }
      }
    }
  }

  return result;
}
