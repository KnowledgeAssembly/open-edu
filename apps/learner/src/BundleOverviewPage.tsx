import { useMemo } from 'react';
import { BundleOverview } from '@open-edu/runtime';
import type { BundleOverviewModule } from '@open-edu/runtime';
import type { LoadedBundle } from '@open-edu/core';
import type { BundleProgressSnapshot } from '@open-edu/schemas';

export interface BundleOverviewPageProps {
  bundle: LoadedBundle;
  bundleProgress: BundleProgressSnapshot | null;
  onStartModule: (bundleId: string, moduleId: string) => void;
  onBackToCatalog: () => void;
}

export function BundleOverviewPage(props: BundleOverviewPageProps): JSX.Element {
  const { bundle, bundleProgress, onStartModule, onBackToCatalog } = props;

  const nodeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const mod of bundle.modules) {
      counts[mod.manifest.id] = mod.nodes.length;
    }
    return counts;
  }, [bundle]);

  const overviewModules: BundleOverviewModule[] = useMemo(() => {
    return bundle.manifest.modules.map((mod) => {
      const progress = bundleProgress?.moduleProgress[mod.id];
      const snapshotStatus = bundleProgress?.moduleStatuses[mod.id];
      const status =
        snapshotStatus ??
        (mod.dependsOn.length === 0 ||
        mod.dependsOn.every((depId) => bundleProgress?.moduleStatuses[depId] === 'completed')
          ? 'unlocked'
          : 'locked');

      const prerequisiteLabel =
        status === 'locked' && mod.dependsOn.length > 0
          ? `Complete ${mod.dependsOn
              .map((depId) => {
                const depMod = bundle.manifest.modules.find((m) => m.id === depId);
                return depMod?.title ?? depId;
              })
              .join(', ')} first`
          : undefined;

      return {
        id: mod.id,
        title: mod.title,
        chapterCode: mod.chapterCode,
        status: status as BundleOverviewModule['status'],
        nodeCount: nodeCounts[mod.id] ?? 0,
        completedNodeCount: progress ? new Set(progress.visitedNodes).size : 0,
        estimatedDuration: mod.estimatedDuration,
        prerequisiteLabel,
      };
    });
  }, [bundle, bundleProgress, nodeCounts]);

  return (
    <BundleOverview
      bundleTitle={bundle.manifest.title}
      bundleId={bundle.manifest.id}
      description={bundle.manifest.description}
      modules={overviewModules}
      onStartModule={(moduleId) => onStartModule(bundle.manifest.id, moduleId)}
      onContinueModule={(moduleId) => onStartModule(bundle.manifest.id, moduleId)}
      onBackToCatalog={onBackToCatalog}
    />
  );
}
