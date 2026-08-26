# Community Widgets — Local Developer Experience

> **Goal:** Make community widgets directly deployable in the learner app with a single env var, matching the simplicity of `EDU_CATALOG_DIR` for courses.

## Problem

Today, loading a community widget in the learner app requires the dev-server + 3 DevTools globals. The learner has no built-in widget registry — it depends on an external catalog URL set via `window.__OPEN_EDU_WIDGET_CATALOG_URL__`.

**Goal state:**

```bash
EDU_CATALOG_DIR=./examples EDU_WIDGET_DIR=./examples/community-widget-counter \
  pnpm --filter @open-edu/learner dev
```

One env var. The learner serves the widgets itself. No dev-server. No DevTools.

---

## Design

The learner's `vite.config.ts` already has the `eduDataPlugin` pattern: a `configureServer` hook that registers middleware to serve course assets from `EDU_CATALOG_DIR`. Apply the same pattern for widgets.

### Widget directory structure

Same layout as `WidgetRegistryStore` on disk:

```
$EDU_WIDGET_DIR/
  localpub/
    community.example.counter/
      1.0.0/
        manifest.json
        index.html
```

Multiple publishers and widgets are supported:

```
$EDU_WIDGET_DIR/
  publisher-a/
    widget-one/
      1.0.0/  manifest.json + index.html
      1.1.0/  manifest.json + index.html
  publisher-b/
    widget-two/
      0.1.0/  manifest.json + index.html
```

### Catalog generation

Scan the directory at server start. For each `{publisher}/{widgetId}/{version}/manifest.json`:

1. Read and parse the manifest
2. Check status (revoked → skip, disabled → skip)
3. Build `manifestUrl` as `http://localhost:4001/widget-registry/{publisher}/{widgetId}/{version}/manifest.json`
4. Include in catalog with `registryId: "local"` and `origin: "http://localhost:4001"`

### Auto-discovery in CourseRuntime

When no explicit `__OPEN_EDU_WIDGET_CATALOG_URL__` or env var is set, and the learner is in dev mode, probe `/widget-registry/catalog.json` from the same origin. If it returns a valid catalog, use it.

---

## Files to change

### `apps/learner/vite.config.ts`

Add `EDU_WIDGET_DIR` env var and `widgetRegistryPlugin()`:

```ts
const WIDGET_DIR = process.env.EDU_WIDGET_DIR ? resolve(process.env.EDU_WIDGET_DIR) : undefined;
```

Add plugin with `configureServer` middleware that handles:

| Request                                               | Response                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `GET /widget-registry/catalog.json`                   | Scan `WIDGET_DIR`, return `{ registryId, origin, widgets[] }`            |
| `GET /widget-registry/{pub}/{id}/{ver}/manifest.json` | Serve `manifest.json` bytes verbatim                                     |
| `GET /widget-registry/{pub}/{id}/{ver}/index.html`    | Serve `index.html` with `Content-Security-Policy: sandbox allow-scripts` |

Middleware registers only when `WIDGET_DIR` is set. Logs to console on startup:

```
[widget-registry] Serving 2 widget(s) from /path/to/widgets (registry: local)
```

### `apps/learner/src/CourseRuntime.tsx`

Auto-discover the catalog when running in dev mode:

```ts
const widgetCatalogUrl =
  (globalThis as { __OPEN_EDU_WIDGET_CATALOG_URL__?: string }).__OPEN_EDU_WIDGET_CATALOG_URL__ ??
  (import.meta.env.VITE_OPEN_EDU_WIDGET_CATALOG_URL as string | undefined) ??
  (import.meta.env as Record<string, string | undefined>).OPEN_EDU_WIDGET_CATALOG_URL ??
  // Auto-discover from learner's own dev server
  (import.meta.env.DEV ? '/widget-registry/catalog.json' : undefined);
```

Auto-add the catalog origin to `allowedOrigins` and `registryCatalogOrigins` so the resolver accepts local widgets without needing `__OPEN_EDU_WIDGET_ORIGINS__`:

```ts
// After building widgetOrigins from env vars + globals:
if (widgetCatalogUrl) {
  try {
    const catalogOrigin = new URL(widgetCatalogUrl).origin;
    if (!widgetOrigins.includes(catalogOrigin)) widgetOrigins.push(catalogOrigin);
  } catch {
    /* ignore */
  }
}
```

Auto-allow experimental widgets when the catalog is locally served:

```ts
// If catalog is from localhost, allow experimental widgets automatically
const allowLocalExperimental =
  widgetCatalogUrl?.startsWith('/') || widgetCatalogUrl?.includes('localhost');
```

### `apps/learner/vite.config.ts` — plugin implementation

```ts
function widgetRegistryPlugin(): Plugin | undefined {
  if (!WIDGET_DIR) return undefined;

  return {
    name: 'widget-registry',
    configureServer(server) {
      const catalog = scanWidgetDir(WIDGET_DIR);

      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent(req.url ?? '');

        // GET /widget-registry/catalog.json
        if (url === '/widget-registry/catalog.json' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify(catalog));
          return;
        }

        // GET /widget-registry/{pub}/{id}/{ver}/manifest.json
        const manifestMatch = url.match(
          /^\/widget-registry\/([^/]+)\/([^/]+)\/([^/]+)\/manifest\.json$/,
        );
        if (manifestMatch && req.method === 'GET') {
          const [, pub, id, ver] = manifestMatch;
          const filePath = join(WIDGET_DIR, pub, id, ver, 'manifest.json');
          if (existsSync(filePath)) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(readFileSync(filePath));
            return;
          }
        }

        // GET /widget-registry/{pub}/{id}/{ver}/index.html
        const docMatch = url.match(/^\/widget-registry\/([^/]+)\/([^/]+)\/([^/]+)\/index\.html$/);
        if (docMatch && req.method === 'GET') {
          const [, pub, id, ver] = docMatch;
          const filePath = join(WIDGET_DIR, pub, id, ver, 'index.html');
          if (existsSync(filePath)) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(readFileSync(filePath));
            return;
          }
        }

        next();
      });
    },
  };
}

function scanWidgetDir(dir: string) {
  const widgets: Array<{
    id: string;
    version: string;
    manifestUrl: string;
    status: string;
    trustTier: string;
    offline: boolean;
  }> = [];

  for (const publisher of readdirSync(dir, { withFileTypes: true })) {
    if (!publisher.isDirectory() || publisher.name.startsWith('.')) continue;
    for (const widget of readdirSync(join(dir, publisher.name), { withFileTypes: true })) {
      if (!widget.isDirectory()) continue;
      for (const version of readdirSync(join(dir, publisher.name, widget.name), {
        withFileTypes: true,
      })) {
        if (!version.isDirectory()) continue;
        const manifestPath = join(dir, publisher.name, widget.name, version.name, 'manifest.json');
        if (!existsSync(manifestPath)) continue;
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          if (manifest.status === 'disabled') continue;
          widgets.push({
            id: manifest.id ?? `${publisher.name}.${widget.name}`,
            version: manifest.version ?? version.name,
            manifestUrl: `/widget-registry/${publisher.name}/${widget.name}/${version.name}/manifest.json`,
            status: manifest.status ?? 'experimental',
            trustTier: 'sandboxed',
            offline: true,
          });
        } catch {
          // skip invalid manifests
        }
      }
    }
  }

  return {
    registryId: 'local',
    origin: 'http://localhost:4001',
    widgets,
  };
}
```

---

## User experience

**Before:**

```bash
# Start dev-server (separate process)
OPEN_EDU_WIDGET_REGISTRY=./my-widgets OPEN_EDU_WIDGET_REGISTRY_ID=localdev \
  pnpm --filter @open-edu/dev-server exec vite --mode browser --port 4002

# Start learner
pnpm --filter @open-edu/learner dev

# Open DevTools and set 3 globals before navigating
window.__OPEN_EDU_WIDGET_CATALOG_URL__ = 'http://localhost:4002/widget-registry/catalog.json';
window.__OPEN_EDU_WIDGET_ORIGINS__ = 'http://localhost:4002';
window.__OPEN_EDU_ALLOW_EXPERIMENTAL_WIDGETS__ = true;
```

**After:**

```bash
EDU_CATALOG_DIR=./examples EDU_WIDGET_DIR=./examples/community-widget-counter \
  pnpm --filter @open-edu/learner dev
# Navigate to course — widget loads automatically
```

---

## Verification

1. `EDU_WIDGET_DIR=./examples/community-widget-counter pnpm --filter @open-edu/learner dev` — console shows `[widget-registry] Serving 1 widget(s)`, `GET /widget-registry/catalog.json` returns valid catalog
2. Navigate to `community-widget-counter-course` — widget iframe loads, counter works
3. `pnpm test:e2e tests/e2e/community-widget.spec.ts` — existing E2E tests still pass (globals take priority over auto-discovery)
4. `pnpm typecheck` — no type errors
5. `pnpm lint` — no lint errors
