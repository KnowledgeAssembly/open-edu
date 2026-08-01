import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'url';
import { scanAll, scanPackages, loadPackage, loadBundle, ASSET_MIME_TYPES } from '@open-edu/core';
import type { PackageSummary, LoadedPackage, BundleSummary } from '@open-edu/core';
import { llmProxyHandler } from './src/llm-proxy/index.js';
import { loadDictionary, handleDictionaryRequest } from './src/dictionary-server.js';
import { createPipiliHandler } from './src/pipili/index.js';
import { oepProxyHandler } from './src/oep-proxy/index.js';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_DIR = process.env.EDU_CATALOG_DIR
  ? resolve(process.env.EDU_CATALOG_DIR)
  : resolve(__dirname, '../../examples');
const PKGS_DIR = resolve(__dirname, '../../packages');
const VIRTUAL_MODULE_ID = 'virtual:edu-data';
const RESOLVED_MODULE_ID = '\0' + VIRTUAL_MODULE_ID;

function findAssetsDirs(catalogDir: string): string[] {
  const dirs: string[] = [];
  try {
    const entries = readdirSync(catalogDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue;
      const assetsDir = join(catalogDir, entry.name, 'assets');
      if (existsSync(assetsDir)) {
        dirs.push(assetsDir);
      }
      // Also check for standalone package directories
      if (
        existsSync(join(catalogDir, entry.name, 'package.json')) ||
        existsSync(join(catalogDir, entry.name, 'bundle.json'))
      ) {
        // already added above if assets exists
      }
    }
  } catch {
    // catalog dir not accessible, skip
  }
  return dirs;
}

function eduDataPlugin(): Plugin {
  return {
    name: 'edu-data-loader',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_MODULE_ID;
    },
    configureServer(server) {
      server.middlewares.use(oepProxyHandler);

      server.middlewares.use(llmProxyHandler);

      // Pipili AI Companion endpoint
      const pipiliHandler = createPipiliHandler();
      server.middlewares.use('/api/pipili', async (req, res, next) => {
        if (req.url?.startsWith('/chat')) {
          try {
            await pipiliHandler(req, res);
          } catch (err) {
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
            }
          }
          return;
        }
        next();
      });

      // Load dictionary on server startup
      const dictionaryDir = resolve(PKGS_DIR, 'ai-companion/src/data/external');
      loadDictionary(dictionaryDir);

      // Dictionary API endpoints (server-side search: never sends full dict to browser)
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (handleDictionaryRequest(req, res)) return;
        next();
      });

      // Serve external dictionary static files at /dictionary/
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = decodeURIComponent(req.url ?? '');
        if (!url.startsWith('/dictionary/')) return next();
        const filePath = join(dictionaryDir, url.slice('/dictionary/'.length));
        if (!filePath.startsWith(dictionaryDir)) return next();
        try {
          if (statSync(filePath).isFile()) {
            const ext = extname(filePath);
            res.setHeader('Content-Type', ASSET_MIME_TYPES[ext] ?? 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(readFileSync(filePath));
            return;
          }
        } catch {
          // file not found
        }
        next();
      });

      const assetDirs = findAssetsDirs(CATALOG_DIR);
      if (assetDirs.length === 0) return;

      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const requestPath = decodeURIComponent(req.url ?? '');
        if (!requestPath.startsWith('/assets/')) return next();

        const relativePath = requestPath.slice('/assets/'.length);
        for (const assetsDir of assetDirs) {
          const filePath = join(assetsDir, relativePath);
          if (!filePath.startsWith(assetsDir)) continue;
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
            continue;
          }
        }
        next();
      });

      console.log(`[edu-data] Serving assets from ${assetDirs.length} package(s) (${CATALOG_DIR})`);
    },
    configurePreviewServer(server) {
      server.middlewares.use(oepProxyHandler);
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

export default defineConfig(({ mode }) => {
  const envDir = resolve(__dirname);
  const env = loadEnv(mode, envDir, '');
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith('LLM_') && !process.env[key]) {
      process.env[key] = value;
    }
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 300,
                },
                networkTimeoutSeconds: 3,
              },
            },
            {
              urlPattern: /\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'course-assets',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 2592000,
                },
              },
            },
            {
              urlPattern: /\/api\/.*\/(catalog|metadata|summary)/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'metadata-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 86400,
                },
              },
            },
          ],
        },
      }),
      eduDataPlugin(),
    ],
    resolve: {
      alias: [
        { find: /^fs\/promises$/, replacement: resolve(__dirname, 'src/stubs/fs-promises.ts') },
        { find: /^fs$/, replacement: resolve(__dirname, 'src/stubs/fs.ts') },
        { find: /^path$/, replacement: resolve(__dirname, 'src/stubs/path.ts') },
        { find: /^child_process$/, replacement: resolve(__dirname, 'src/stubs/child_process.ts') },
        { find: /^util$/, replacement: resolve(__dirname, 'src/stubs/util.ts') },
        { find: '@', replacement: resolve(__dirname, './src') },
        {
          find: /^@open-edu\/telemetry$/,
          replacement: resolve(PKGS_DIR, 'telemetry/src/index.ts'),
        },
        { find: /^@open-edu\/rewards$/, replacement: resolve(PKGS_DIR, 'rewards/src/index.ts') },
      ],
    },
    server: {
      port: 4001,
      headers: {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
    preview: {
      headers: {
        'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    },
  };
});
