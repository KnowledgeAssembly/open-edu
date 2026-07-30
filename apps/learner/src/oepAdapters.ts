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
import type { PackageSummary, LoadedPackage, LoadedNode, BundleSummary } from '@open-edu/core';
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

  const totalNodeCount = bundle.modules.reduce(
    (sum, mod) => sum + (mod.nodes?.length ?? 0),
    0,
  );

  return {
    manifest,
    moduleCount: manifest.modules.length,
    totalNodeCount,
    rootDir: `${OEP_PREFIX}${bundle.id}`,
    moduleSummaries: bundle.modules.map((mod) => ({
      manifest: mod.manifest as { id: string; title: string; version: string; author: string; entry: string },
      nodeCount: mod.nodes?.length ?? 0,
      availableBadges: 0,
      rootDir: `${OEP_PREFIX}${bundle.id}/${mod.manifest.id as string}`,
    })),
  };
}
