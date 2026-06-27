import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadPackage, loadBundle } from '@open-edu/core';
import type { LoadedPackage, LoadedBundle } from '@open-edu/core';
import type { ViteDevServer } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:open-edu-package';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;

function eduPackageLoader(): Plugin {
  let packageData: LoadedPackage | null = null;
  let bundleData: LoadedBundle | null = null;
  let server: ViteDevServer | null = null;
  let packageDir = '';
  let bundleDir = '';
  let isBundleMode = false;

  return {
    name: 'edu-package-loader',
    enforce: 'pre',

    configResolved() {
      packageDir = process.env.OPEN_EDU_PACKAGE_DIR ?? '';
      bundleDir = process.env.OPEN_EDU_BUNDLE_DIR ?? '';

      if (bundleDir) {
        isBundleMode = true;
      } else if (packageDir) {
        const hasPackageJson = existsSync(join(packageDir, 'package.json'));
        const hasBundleJson = existsSync(join(packageDir, 'bundle.json'));
        if (hasBundleJson && !hasPackageJson) {
          isBundleMode = true;
          bundleDir = packageDir;
          packageDir = '';
        }
      }
    },

    async buildStart() {
      if (isBundleMode && bundleDir) {
        try {
          bundleData = await loadBundle(bundleDir);
          console.log(
            `[edu-dev] Loaded bundle: ${bundleData.manifest.title} (${bundleData.modules.length} modules)`,
          );
        } catch (err) {
          console.error('[edu-dev] Failed to load bundle:', err);
        }
      } else if (packageDir) {
        try {
          packageData = await loadPackage(packageDir);
          console.log(`[edu-dev] Loaded package: ${packageData.manifest.title}`);
        } catch (err) {
          console.error('[edu-dev] Failed to load package:', err);
        }
      } else {
        console.warn('[edu-dev] No OPEN_EDU_PACKAGE_DIR or OPEN_EDU_BUNDLE_DIR defined');
      }
    },

    configureServer(srv) {
      server = srv;
      const watchDir = bundleDir || packageDir;
      if (!watchDir) return;

      srv.watcher.add(watchDir);
      srv.watcher.on('change', async (filePath) => {
        if (filePath.startsWith(watchDir)) {
          try {
            if (isBundleMode) {
              bundleData = await loadBundle(bundleDir);
            } else {
              packageData = await loadPackage(packageDir);
            }
            const mod = srv.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
            if (mod) {
              srv.moduleGraph.invalidateModule(mod);
            }
            srv.ws.send({ type: 'full-reload' });
          } catch (err) {
            console.error('[edu-dev] Failed to reload:', err);
          }
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        if (isBundleMode && bundleData) {
          const serialized = {
            ...bundleData,
            moduleMap: Array.from(bundleData.moduleMap.entries()),
          };
          return `export const packageData = null;\nexport const bundleData = ${JSON.stringify(serialized)};`;
        }
        if (packageData) {
          return `export const packageData = ${JSON.stringify(packageData)};\nexport const bundleData = null;`;
        }
        return 'export const packageData = null;\nexport const bundleData = null;';
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), eduPackageLoader()],
  define: {
    OPEN_EDU_PACKAGE_DIR: process.env.OPEN_EDU_PACKAGE_DIR
      ? JSON.stringify(process.env.OPEN_EDU_PACKAGE_DIR)
      : '""',
  },
  server: {
    port: 4000,
    open: true,
  },
});
