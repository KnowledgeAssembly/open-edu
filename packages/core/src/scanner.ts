import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PackageManifestSchema, RewardsSchema } from '@open-edu/schemas';
import type { PackageManifest } from '@open-edu/schemas';
import { coreScannerLogger } from './logger.js';

export interface PackageSummary {
  manifest: PackageManifest;
  nodeCount: number;
  availableBadges: number;
  rootDir: string;
}

export function scanPackages(dir: string): PackageSummary[] {
  coreScannerLogger.info('Scanning packages...', { dir });
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    coreScannerLogger.warn(`Cannot read directory ${dir}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }

  const results: PackageSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pkgDir = join(dir, entry.name);

    try {
      const manifestRaw = readFileSync(join(pkgDir, 'package.json'), 'utf-8');
      const manifestJson = JSON.parse(manifestRaw);
      const manifest = PackageManifestSchema.parse(manifestJson);

      let nodeCount = 0;
      try {
        nodeCount = readdirSync(join(pkgDir, 'nodes')).length;
      } catch {
        nodeCount = 0;
      }

      let availableBadges = 0;
      const rewardsPath = join(pkgDir, 'rewards.json');
      if (existsSync(rewardsPath)) {
        try {
          const rewardsRaw = readFileSync(rewardsPath, 'utf-8');
          const rewardsJson = JSON.parse(rewardsRaw);
          const rewards = RewardsSchema.parse(rewardsJson);
          for (const trigger of rewards.triggers) {
            for (const reward of trigger.rewards) {
              if (reward.action === 'badge.award') {
                availableBadges++;
              }
            }
          }
        } catch {
          availableBadges = 0;
        }
      }

      results.push({ manifest, nodeCount, availableBadges, rootDir: pkgDir });
    } catch (err) {
      coreScannerLogger.debug(`Skipping invalid package ${pkgDir}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  coreScannerLogger.info('Package scan complete', { dir, count: results.length });
  return results;
}
