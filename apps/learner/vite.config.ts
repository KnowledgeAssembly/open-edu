import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { scanAll, scanPackages, loadPackage, loadBundle } from '@open-edu/core';
import type { PackageSummary, LoadedPackage, BundleSummary } from '@open-edu/core';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = resolve(__dirname, '../../examples');
const VIRTUAL_MODULE_ID = 'virtual:edu-data';
const RESOLVED_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

function eduDataPlugin(): Plugin {
  return {
    name: 'edu-data-loader',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_MODULE_ID;
    },
    async load(id) {
      if (id !== RESOLVED_MODULE_ID) return;

      // Use scanAll to get filtered packages + bundles
      const { packages: catalogPackages, bundles: catalogBundles } = scanAll(CATALOG_DIR);

      // Load all top-level packages into the entries map
      const allPackageSummaries = scanPackages(CATALOG_DIR);
      const packageEntries: Record<string, LoadedPackage> = {};
      for (const summary of allPackageSummaries) {
        try {
          const pkg = await loadPackage(summary.rootDir);
          packageEntries[summary.manifest.id] = pkg;
        } catch {
          // skip invalid packages silently
        }
      }

      // Load bundles; convert moduleMap to array for JSON serialization
      const bundleEntries: Record<string, unknown> = {};
      for (const bundle of catalogBundles) {
        try {
          const loaded = await loadBundle(bundle.rootDir);
          // Add each module package from the bundle into packageEntries
          // so they can be launched from the bundle overview
          for (const [moduleId, modulePkg] of loaded.moduleMap) {
            if (!packageEntries[moduleId]) {
              packageEntries[moduleId] = modulePkg;
            }
          }
          bundleEntries[bundle.manifest.id] = {
            ...loaded,
            moduleMap: Array.from(loaded.moduleMap.entries()),
          };
        } catch {
          // skip invalid bundles silently
        }
      }

      const catalogJson = JSON.stringify(catalogPackages);
      const packagesJson = JSON.stringify(packageEntries);
      const bundlesJson = JSON.stringify(catalogBundles);
      const bundleEntriesJson = JSON.stringify(bundleEntries);

      return `
export const catalogPackages = ${catalogJson};
export const packageEntries = ${packagesJson};
export const catalogBundles = ${bundlesJson};
export const bundleEntries = ${bundleEntriesJson};
`;
    },
  };
}

export default defineConfig({
  plugins: [react(), eduDataPlugin()],
  server: { port: 4001 },
});
