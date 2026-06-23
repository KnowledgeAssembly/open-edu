import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { loadPackage } from '@open-edu/core';
import type { LoadedPackage } from '@open-edu/core';
import type { ViteDevServer } from 'vite';

const VIRTUAL_MODULE_ID = 'virtual:open-edu-package';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;

function eduPackageLoader(): Plugin {
  let packageData: LoadedPackage | null = null;
  let server: ViteDevServer | null = null;
  let packageDir = '';

  return {
    name: 'edu-package-loader',
    enforce: 'pre',

    configResolved() {
      packageDir = process.env.OPEN_EDU_PACKAGE_DIR ?? '';
    },

    async buildStart() {
      if (!packageDir) {
        console.warn('[edu-dev] No OPEN_EDU_PACKAGE_DIR defined, skipping package load');
        return;
      }
      try {
        packageData = await loadPackage(packageDir);
        console.log(`[edu-dev] Loaded package: ${packageData.manifest.title}`);
      } catch (err) {
        console.error('[edu-dev] Failed to load package:', err);
      }
    },

    configureServer(srv) {
      server = srv;
      if (!packageDir) return;

      srv.watcher.add(packageDir);
      srv.watcher.on('change', async (filePath) => {
        if (filePath.startsWith(packageDir)) {
          try {
            packageData = await loadPackage(packageDir);
            const mod = srv.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
            if (mod) {
              srv.moduleGraph.invalidateModule(mod);
            }
            srv.ws.send({ type: 'full-reload' });
          } catch (err) {
            console.error('[edu-dev] Failed to reload package:', err);
          }
        }
      });
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_ID;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ID) {
        if (!packageData) {
          return 'export const packageData = null;';
        }
        return `export const packageData = ${JSON.stringify(packageData)};`;
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
