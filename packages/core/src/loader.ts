import type { LoadedPackage } from './types.js';
import { loadManifest } from './manifest.js';
import { loadWorkflow } from './workflow.js';
import { loadRewards } from './rewards.js';
import { loadCards } from './cards.js';
import { loadNodes } from './nodes.js';
import { resolveAssets } from './assets.js';
import { EntryNodeNotFoundError, WorkflowRouteError } from './errors.js';
import { coreLoaderLogger } from './logger.js';

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
  coreLoaderLogger.info('Loading package...', { rootDir: packageDir });
  coreLoaderLogger.time('load-package');

  const manifest = await loadManifest(packageDir);

  const [workflow, rewards, cards, nodes, assetPaths] = await Promise.all([
    loadWorkflow(packageDir),
    loadRewards(packageDir),
    loadCards(packageDir),
    loadNodes(packageDir),
    resolveAssets(packageDir),
  ]);

  const nodeMap = new Map(nodes.map((n) => [n.relativePath, n]));
  const available = Array.from(nodeMap.keys());
  const list = (extra?: string) =>
    `Available nodes: ${available.join(', ')}${extra ? `. ${extra}` : ''}`;

  const manifestNodePath = manifest.entry;
  if (!nodeMap.has(manifestNodePath)) {
    coreLoaderLogger.error(`Entry node "${manifestNodePath}" not found in package ${packageDir}`, {
      path: manifestNodePath,
      available,
    });
    throw new EntryNodeNotFoundError(
      `Entry node "${manifestNodePath}" not found in package. ${list()}`,
      {
        path: manifestNodePath,
        suggestion: `Create a file at "nodes/${manifestNodePath.replace('nodes/', '')}" or change the "entry" field in package.json to one of: ${available.join(', ')}`,
      },
    );
  }

  if (workflow) {
    const routingKeys: string[] = [];
    for (const routePath of Object.keys(workflow.routing)) {
      if (!nodeMap.has(routePath)) {
        coreLoaderLogger.warn(`Workflow references unknown node "${routePath}"`, { routePath });
        throw new WorkflowRouteError(`Workflow references unknown node "${routePath}". ${list()}`, {
          path: routePath,
          suggestion: `Add a node at "nodes/${routePath.replace('nodes/', '')}" or remove the "${routePath}" key from workflow.json routing`,
        });
      }
      routingKeys.push(routePath);
    }

    const targets = collectRouteTargets(workflow.routing);
    for (const target of targets) {
      if (target === COMPLETED_SENTINEL) continue;
      if (!nodeMap.has(target)) {
        coreLoaderLogger.warn(`Workflow route targets unknown node "${target}"`, { target });
        throw new WorkflowRouteError(`Workflow route targets unknown node "${target}". ${list()}`, {
          path: target,
          suggestion: `Add a node at "nodes/${target.replace('nodes/', '')}" or change the route target in workflow.json to one of: ${available.join(', ')}`,
        });
      }
    }

    if (!routingKeys.includes(manifestNodePath)) {
      coreLoaderLogger.warn(`Manifest entry "${manifestNodePath}" is not a workflow routing key`, {
        manifestNodePath,
      });
      throw new WorkflowRouteError(
        `Manifest entry "${manifestNodePath}" is not a key in workflow.routing. The entry must be the first visited node. Routing keys: ${routingKeys.join(', ')}`,
      );
    }
  }

  coreLoaderLogger.timeEnd('load-package');
  coreLoaderLogger.info('Package loaded successfully', {
    rootDir: packageDir,
    nodeCount: nodes.length,
  });

  return {
    rootDir: packageDir,
    manifest,
    workflow,
    rewards,
    cards,
    nodes,
    assetPaths,
  };
}
