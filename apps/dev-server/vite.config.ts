import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadPackage, loadBundle } from '@open-edu/core';
import type { LoadedPackage, LoadedBundle } from '@open-edu/core';

const VIRTUAL_MODULE_ID = 'virtual:open-edu-package';
const RESOLVED_VIRTUAL_ID = `\0${VIRTUAL_MODULE_ID}`;

const ASSET_MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

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

      // Serve static assets from the package's assets/ directory
      const assetsDir = packageDir ? join(packageDir, 'assets') : null;
      if (assetsDir && existsSync(assetsDir)) {
        const regexp = /^\/assets\//;
        srv.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const requestPath = decodeURIComponent(req.url ?? '');
          const match = requestPath.match(regexp);
          if (!match) return next();
          const relativePath = requestPath.slice(match[0].length);
          const filePath = join(assetsDir, relativePath);
          if (!filePath.startsWith(assetsDir)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }
          try {
            const stat = statSync(filePath);
            if (stat.isFile()) {
              const ext = extname(filePath).toLowerCase();
              res.setHeader('Content-Type', ASSET_MIME_TYPES[ext] ?? 'application/octet-stream');
              res.setHeader('Cache-Control', 'no-cache');
              res.end(readFileSync(filePath));
              return;
            }
          } catch {
            // file not found, fall through
          }
          next();
        });
        console.log(`[edu-dev] Serving assets from: ${assetsDir}`);
      }
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
