import type { ContentNode, Workflow, Rewards, RouteDefinition } from '@open-edu/schemas';

export interface LoadedNode {
  path: string;
  relativePath: string;
  content: string;
  node: ContentNode;
}

export interface LoadedPackage {
  rootDir: string;
  manifest: {
    id: string;
    title: string;
    version: string;
    author: string;
    entry: string;
  };
  workflow: Workflow | null;
  rewards: Rewards | null;
  nodes: LoadedNode[];
  assetPaths: string[];
}

export interface LoadedRouteDefinition {
  path: string;
  definition: RouteDefinition;
}
