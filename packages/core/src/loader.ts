import type { LoadedPackage } from './types';
import { loadManifest } from './manifest';
import { loadWorkflow } from './workflow';
import { loadRewards } from './rewards';
import { loadNodes } from './nodes';
import { resolveAssets } from './assets';
import { EntryNodeNotFoundError, WorkflowRouteError } from './errors';

const COMPLETED_SENTINEL = 'COMPLETED';

function collectRouteTargets(routing: Record<string, unknown>): string[] {
  const targets: string[] = [];
  for (const def of Object.values(routing)) {
    if (typeof def !== 'object' || def === null) continue;
    if ('onComplete' in def && typeof def.onComplete === 'string') {
      targets.push(def.onComplete);
    }
    if ('conditions' in def && Array.isArray(def.conditions)) {
      for (const cond of def.conditions) {
        if (cond && typeof cond === 'object' && 'then' in cond) {
          const then = (cond as { then?: unknown }).then;
          if (typeof then === 'string') targets.push(then);
        }
      }
    }
  }
  return targets;
}

export type LoadOptions = Record<string, never>;

export async function loadPackage(
  packageDir: string,
  _options?: LoadOptions,
): Promise<LoadedPackage> {
  const manifest = await loadManifest(packageDir);

  const [workflow, rewards, nodes, assetPaths] = await Promise.all([
    loadWorkflow(packageDir),
    loadRewards(packageDir),
    loadNodes(packageDir),
    resolveAssets(packageDir),
  ]);

  const nodeMap = new Map(nodes.map((n) => [n.relativePath, n]));
  const available = Array.from(nodeMap.keys());
  const list = (extra?: string) =>
    `Available nodes: ${available.join(', ')}${extra ? `. ${extra}` : ''}`;

  const manifestNodePath = manifest.entry;
  if (!nodeMap.has(manifestNodePath)) {
    throw new EntryNodeNotFoundError(
      `Entry node "${manifestNodePath}" not found in package. ${list()}`,
    );
  }

  if (workflow) {
    const routingKeys: string[] = [];
    for (const routePath of Object.keys(workflow.routing)) {
      if (!nodeMap.has(routePath)) {
        throw new WorkflowRouteError(`Workflow references unknown node "${routePath}". ${list()}`);
      }
      routingKeys.push(routePath);
    }

    const targets = collectRouteTargets(workflow.routing);
    for (const target of targets) {
      if (target === COMPLETED_SENTINEL) continue;
      if (!nodeMap.has(target)) {
        throw new WorkflowRouteError(`Workflow route targets unknown node "${target}". ${list()}`);
      }
    }

    if (!routingKeys.includes(manifestNodePath)) {
      throw new WorkflowRouteError(
        `Manifest entry "${manifestNodePath}" is not a key in workflow.routing. The entry must be the first visited node. Routing keys: ${routingKeys.join(', ')}`,
      );
    }
  }

  return {
    rootDir: packageDir,
    manifest,
    workflow,
    rewards,
    nodes,
    assetPaths,
  };
}
