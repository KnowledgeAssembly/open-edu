import type { ContentNode, Workflow, Rewards, PackageManifest } from '@open-edu/schemas';

export interface LoadedNode {
  path: string;
  relativePath: string;
  content: string;
  node: ContentNode;
}

export interface LoadedPackage {
  rootDir: string;
  manifest: PackageManifest;
  workflow: Workflow | null;
  rewards: Rewards | null;
  nodes: LoadedNode[];
  assetPaths: string[];
}
