import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BundleManifestSchema } from '@open-edu/schemas';
import type { BundleManifest } from '@open-edu/schemas';
import { scanPackages } from './scanner.js';
import type { PackageSummary } from './scanner.js';
import { coreScannerLogger } from './logger.js';

export interface BundleSummary {
  manifest: BundleManifest;
  moduleCount: number;
  totalNodeCount: number;
  rootDir: string;
  moduleSummaries: PackageSummary[];
  rewardsPath?: string;
  cardsPath?: string;
}

export function scanBundles(dir: string): BundleSummary[] {
  coreScannerLogger.info('Scanning bundles...', { dir });
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    coreScannerLogger.warn(`Cannot read directory ${dir}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }

  const results: BundleSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const bundleDir = join(dir, entry.name);
    const bundleJsonPath = join(bundleDir, 'bundle.json');

    if (!existsSync(bundleJsonPath)) continue;

    try {
      const raw = readFileSync(bundleJsonPath, 'utf-8');
      const json = JSON.parse(raw);
      const manifest = BundleManifestSchema.parse(json);

      let totalNodeCount = 0;
      const moduleSummaries: PackageSummary[] = [];

      for (const moduleRef of manifest.modules) {
        const moduleDir = join(bundleDir, moduleRef.path);
        const summaries = scanPackages(moduleDir);
        for (const s of summaries) {
          totalNodeCount += s.nodeCount;
          moduleSummaries.push(s);
        }
      }

      results.push({
        manifest,
        moduleCount: manifest.modules.length,
        totalNodeCount,
        rootDir: bundleDir,
        moduleSummaries,
        rewardsPath: manifest.rewards,
        cardsPath: manifest.cards,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      coreScannerLogger.warn(`Skipping invalid bundle in "${bundleDir}": ${message}`);
    }
  }

  coreScannerLogger.info('Bundle scan complete', { dir, count: results.length });
  return results;
}

export function scanAll(dir: string): {
  packages: PackageSummary[];
  bundles: BundleSummary[];
} {
  const packages = scanPackages(dir);
  const bundles = scanBundles(dir);

  // Filter out packages that are part of a bundle (bundles take precedence)
  const bundleDirs = new Set(bundles.map((b) => b.rootDir));
  const filteredPackages = packages.filter((p) => !bundleDirs.has(p.rootDir));

  return { packages: filteredPackages, bundles };
}
