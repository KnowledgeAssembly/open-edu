import type { LoadedPackage } from './types';
import { loadManifest } from './manifest';
import { loadWorkflow } from './workflow';
import { loadRewards } from './rewards';
import { loadNodes } from './nodes';
import { resolveAssets } from './assets';

export interface LoadOptions {
  validate?: boolean;
}

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

  const nodeMap = new Map(nodes.map((n: { relativePath: string }) => [n.relativePath, n]));

  const manifestNodePath = manifest.entry;
  if (!nodeMap.has(manifestNodePath)) {
    throw new Error(
      `Entry node "${manifestNodePath}" not found in package. Available nodes: ${Array.from(nodeMap.keys()).join(', ')}`,
    );
  }

  if (workflow) {
    for (const routePath of Object.keys(workflow.routing)) {
      if (!nodeMap.has(routePath)) {
        throw new Error(
          `Workflow references unknown node "${routePath}". Available nodes: ${Array.from(nodeMap.keys()).join(', ')}`,
        );
      }
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
