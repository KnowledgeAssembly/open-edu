import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { scanPackages, loadPackage } from '@open-edu/core';
import type { PackageSummary, LoadedPackage } from '@open-edu/core';
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

      const summaries = scanPackages(CATALOG_DIR);
      const entries: Array<{ summary: PackageSummary; pkg: LoadedPackage | null }> = [];

      for (const summary of summaries) {
        try {
          const pkg = await loadPackage(summary.rootDir);
          entries.push({ summary, pkg });
        } catch {
          entries.push({ summary, pkg: null });
        }
      }

      const valid = entries.filter(
        (e): e is { summary: PackageSummary; pkg: LoadedPackage } => e.pkg !== null,
      );
      const catalogJson = JSON.stringify(valid.map((e) => e.summary));
      const packagesMap: Record<string, LoadedPackage> = {};
      for (const e of valid) {
        packagesMap[e.summary.manifest.id] = e.pkg;
      }
      const packagesJson = JSON.stringify(packagesMap);

      return `
export const catalogPackages = ${catalogJson};
export const packageEntries = ${packagesJson};
`;
    },
  };
}

export default defineConfig({
  plugins: [react(), eduDataPlugin()],
  server: { port: 4001 },
});
