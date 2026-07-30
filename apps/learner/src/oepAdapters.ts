import {
  PackageManifestSchema,
  RewardsSchema,
  WorkflowSchema,
  CardDefinitionsSchema,
  ContentNodeSchema,
  BundleManifestSchema,
} from '@open-edu/schemas';
import type {
  PackageManifest,
  Rewards,
  Workflow,
  CardDefinitions,
  ContentNode,
} from '@open-edu/schemas';
import type { PackageSummary, LoadedPackage, LoadedNode, BundleSummary, LoadedBundle } from '@open-edu/core';
import type { StoredCourse, StoredBundle } from '@open-edu/storage';

function extractTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)/m);
  return match?.[1]?.trim();
}

function parseNodeContent(relativePath: string, content: string): ContentNode {
  if (relativePath.endsWith('.md')) {
    return { type: 'lesson', title: extractTitle(content) };
  }
  try {
    const parsed = JSON.parse(content);
    const result = ContentNodeSchema.safeParse(parsed);
    if (result.success) return result.data;
  } catch {
    // fall through
  }
  return { type: 'lesson' };
}

function countBadgeRewards(rewards: Rewards | null): number {
  if (!rewards) return 0;
  let count = 0;
  for (const trigger of rewards.triggers) {
    for (const reward of trigger.rewards) {
      if (reward.action === 'badge.award') count++;
    }
  }
  return count;
}

const OEP_PREFIX = 'oep://';

export function isOepCourse(rootDir: string): boolean {
  return rootDir.startsWith(OEP_PREFIX);
}

export function storedCourseToPackageSummary(course: StoredCourse): PackageSummary {
  let manifest: PackageManifest;
  try {
    manifest = PackageManifestSchema.parse(course.manifest);
  } catch {
    manifest = {
      id: course.id,
      title: (course.manifest.title as string) ?? course.id,
      version: course.version,
      author: (course.manifest.author as string) ?? '',
      entry: (course.manifest.entry as string) ?? 'nodes/intro.md',
    };
  }

  let rewards: Rewards | null = null;
  if (course.rewards) {
    const result = RewardsSchema.safeParse(course.rewards);
    if (result.success) rewards = result.data;
  }

  return {
    manifest,
    nodeCount: course.nodes.length,
    availableBadges: countBadgeRewards(rewards),
    rootDir: `${OEP_PREFIX}${course.id}`,
  };
}

export function storedCourseToLoadedPackage(course: StoredCourse): LoadedPackage {
  let manifest: PackageManifest;
  try {
    manifest = PackageManifestSchema.parse(course.manifest);
  } catch {
    manifest = {
      id: course.id,
      title: (course.manifest.title as string) ?? course.id,
      version: course.version,
      author: (course.manifest.author as string) ?? '',
      entry: (course.manifest.entry as string) ?? 'nodes/intro.md',
    };
  }

  let workflow: Workflow | null = null;
  if (course.workflow) {
    const result = WorkflowSchema.safeParse(course.workflow);
    if (result.success) workflow = result.data;
  }

  let rewards: Rewards | null = null;
  if (course.rewards) {
    const result = RewardsSchema.safeParse(course.rewards);
    if (result.success) rewards = result.data;
  }

  let cards: CardDefinitions | null = null;
  if (course.cards) {
    const result = CardDefinitionsSchema.safeParse(course.cards);
    if (result.success) cards = result.data;
  }

  const nodes: LoadedNode[] = course.nodes.map((n) => {
    const relativePath = (n as Record<string, unknown>).relativePath as string;
    const content = (n as Record<string, unknown>).content as string;
    return {
      path: `${OEP_PREFIX}${course.id}/${relativePath}`,
      relativePath,
      content,
      node: parseNodeContent(relativePath, content),
    };
  });

  const assetPaths = course.assets.map((a) => a.path.replace(/^assets\//, ''));
  const assetMap = new Map<string, ArrayBuffer>();
  for (const a of course.assets) {
    const normalized = a.path.replace(/^assets\//, '');
    assetMap.set(normalized, a.data);
  }

  return {
    rootDir: `${OEP_PREFIX}${course.id}`,
    manifest,
    workflow,
    rewards,
    cards,
    nodes,
    assetPaths,
    assetMap,
  };
}

export function storedBundleToBundleSummary(bundle: StoredBundle): BundleSummary {
  let manifest: ReturnType<typeof BundleManifestSchema.parse>;
  try {
    manifest = BundleManifestSchema.parse(bundle.bundleManifest);
  } catch {
    manifest = {
      id: bundle.id,
      type: 'bundle',
      title: (bundle.bundleManifest.title as string) ?? bundle.id,
      version: bundle.version,
      author: (bundle.bundleManifest.author as string) ?? '',
      modules: [],
    };
  }

  const totalNodeCount = bundle.modules.reduce((sum, mod) => sum + (mod.nodes?.length ?? 0), 0);

  return {
    manifest,
    moduleCount: manifest.modules.length,
    totalNodeCount,
    rootDir: `${OEP_PREFIX}${bundle.id}`,
    moduleSummaries: bundle.modules.map((mod) => ({
      manifest: mod.manifest as {
        id: string;
        title: string;
        version: string;
        author: string;
        entry: string;
      },
      nodeCount: mod.nodes?.length ?? 0,
      availableBadges: 0,
      rootDir: `${OEP_PREFIX}${bundle.id}/${mod.manifest.id as string}`,
    })),
  };
}

export function storedBundleToLoadedBundle(bundle: StoredBundle): LoadedBundle {
  let manifest: ReturnType<typeof BundleManifestSchema.parse>;
  try {
    manifest = BundleManifestSchema.parse(bundle.bundleManifest);
  } catch {
    manifest = {
      id: bundle.id,
      type: 'bundle',
      title: (bundle.bundleManifest.title as string) ?? bundle.id,
      version: bundle.version,
      author: (bundle.bundleManifest.author as string) ?? '',
      modules: bundle.modules.map((m) => ({
        id: m.manifest.id as string,
        title: (m.manifest.title as string) ?? (m.manifest.id as string),
        path: `./modules/${m.manifest.id as string}`,
        dependsOn: [],
        estimatedDuration: 10,
      })),
    };
  }

  const modules: LoadedPackage[] = bundle.modules.map((m) => {
    const modRootDir = `${OEP_PREFIX}${bundle.id}/${m.manifest.id as string}`;
    const modManifest: PackageManifest = {
      id: m.manifest.id as string,
      title: (m.manifest.title as string) ?? (m.manifest.id as string),
      version: (m.manifest.version as string) ?? bundle.version,
      author: (m.manifest.author as string) ?? '',
      entry: (m.manifest.entry as string) ?? 'nodes/intro.md',
    };

    const nodes: LoadedNode[] = m.nodes.map((n) => ({
      path: `${modRootDir}/${n.relativePath}`,
      relativePath: n.relativePath,
      content: n.content,
      node: parseNodeContent(n.relativePath, n.content),
    }));

    const assetPaths = m.assets.map((a) => a.path);
    const assetMap = new Map(m.assets.map((a) => [a.path, a.data]));

    let workflow: Workflow | null = null;
    if (m.workflow) {
      const result = WorkflowSchema.safeParse(m.workflow);
      if (result.success) workflow = result.data;
    }

    let rewards: Rewards | null = null;
    if (m.rewards) {
      const result = RewardsSchema.safeParse(m.rewards);
      if (result.success) rewards = result.data;
    }

    let cards: CardDefinitions | null = null;
    if (m.cards) {
      const result = CardDefinitionsSchema.safeParse(m.cards);
      if (result.success) cards = result.data;
    }

    return {
      rootDir: modRootDir,
      manifest: modManifest,
      workflow,
      rewards,
      cards,
      nodes,
      assetPaths,
      assetMap,
    } as LoadedPackage;
  });

  return {
    rootDir: `${OEP_PREFIX}${bundle.id}`,
    manifest,
    modules,
    moduleMap: new Map(modules.map((m) => [m.manifest.id, m])),
  } as LoadedBundle;
}
