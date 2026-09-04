# OpenEdu Installable Device Widget Plugins — Technical Design Spec

**Date:** 2026-09-04
**Status:** Draft for maintainer review
**Audience:** Open-Edu maintainers, widget SDK contributors, implementers
**Scope:** Device-level installation and resolution of custom widgets as first-class `.oep` artifacts, without rebuilding or restarting the learner server and without adding a new service.

## 1. Summary

Open-Edu already supports sandboxed **community widgets** resolved at runtime through a catalog (`CourseRuntime.tsx` fetches `catalog.json` and builds resolver catalogs dynamically) and a **local dev registry** via `EDU_WIDGET_DIR`. The missing capability is a way for an **end user to install a custom widget on their device** and have it available to any course, with no build step, no server restart, and no new service.

This design introduces a **device-level widget plugin store**: a widget is distributed as a standard `.oep` archive, installed through the same flow as a course (URL or catalog), stored device-wide in IndexedDB, and made resolvable to any course by exact ID/version/integrity. It reuses the existing sandboxed self-contained-HTML execution model, the existing OEP install/security pipeline, the existing storage layer, and the existing resolver — extending only the resolver's data source with an in-memory `installed://` transport served from IndexedDB.

There is **exactly one widget format**: self-contained HTML (JS/CSS inlined) running in a sandboxed `<iframe sandbox="allow-scripts">` via `srcDoc`, matching the current community-widget trust model.

## 2. Problem and goals

### 2.1 Problem

- Custom widgets today are either built-in, fetched from a remote public registry/CDN, or served to the dev server from a fixed `EDU_WIDGET_DIR` at Vite-config time.
- `EDU_WIDGET_DIR` is developer-facing: the catalog is scanned once at startup, adding a new widget requires a server restart, and it only serves a single local directory.
- There is no end-user path to install a widget onto their device, independent of any particular course, and have available to any course.

### 2.2 Goals

- Let an end user install a custom widget on their device like they install a course (from a URL or a catalog entry).
- Make an installed widget available to **any** course by exact ID/version/integrity (device-wide plugin store).
- No rebuild, no server restart, no new service — installation writes to IndexedDB and resolution happens at runtime.
- Reuse the .oep archive format, the install/security pipeline, the storage layer, and the resolver.
- Support exactly one widget format: sandboxed self-contained HTML via `srcDoc`.
- Support management: list, enable/disable, view, uninstall, version handling.

### 2.3 Non-goals

- Building a marketplace, billing, or social feature.
- Executing widget code in the learner application's JavaScript realm (no native/trusted tier for installed widgets).
- Shipping widget executable code embedded inside a course package (widgets are device-level, shared across courses).
- Changing the WidgetReference schema (we reuse `source: 'registry'` with `registryId: 'installed'`).
- Serving widget subresource assets (multi-file) for installed widgets — self-contained HTML only.

## 3. Relationship to existing architecture

This is the **device-client realization** of the "install a widget independently of courses" capability described in the existing `2026-08-14-runtime-community-widget-ecosystem-design.md` (Section 13). That spec targets an **instance/server registry**; this design delivers the analogous capability entirely on the **client**, using IndexedDB instead of a server registry and the existing resolver instead of new deployment machinery. It is consistent with — and does not contradict — the ecosystem spec; it brings the installed-widget concept into the learner app's client domain.

### Reuse points

| Existing surface                                    | Reuse                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `.oep` writer/reader/installer                      | Widget `.oep` install; all non-metadata files preserved into storage                  |
| `OEP_CONTENT_ROOT` + reader categorization          | Widget files survive as stored bytes                                                  |
| IndexedDB (`@open-edu/storage` `db.ts`)             | New `widgets` object store parallel to `courses`                                      |
| `InstallCoordinator` + `courseDownload.ts` adapters | Widget install flow and versioning semantics                                          |
| `OepReader` extraction + ZIP security               | Widget archive security (size, path traversal, checksum)                              |
| `WidgetManifestSchema`                              | Widget package manifest (`format: self-contained-html`, `distribution.offline: true`) |
| `createWidgetResolver` + `fetchImpl` injection      | `installed://` transport to read bytes from IndexedDB                                 |
| `loadStaticCatalog` / `ResolverCatalog` shape       | Build an "installed" catalog from `listWidgets()`                                     |
| `SandboxWidgetAdapter` `srcDoc` path                | Rendering self-contained HTML with opaque origin                                      |
| `WidgetPolicy`                                      | Integrity, capability gating, experimental/status policy, CSP                         |
| `install` UI (dialog, catalog, error mapping)       | Widget install + manage list                                                          |

### Key existing files

- `apps/learner/vite.config.ts` — `scanWidgetDir`, `widgetRegistryPlugin`, `EDU_WIDGET_DIR`
- `apps/learner/src/CourseRuntime.tsx` — `createWidgetResolver`, `remoteCatalogs`, `fetchImpl`
- `packages/widgets/src/resolver/widget-resolver.ts` — resolver + `WidgetResolverOptions.fetchImpl`
- `packages/widgets/src/resolver/catalog.ts` — `loadStaticCatalog`, `ResolverCatalog`
- `packages/schemas/src/widget-reference.ts` — `WidgetReference` schemas
- `packages/schemas/src/community-widget-manifest.ts` — `WidgetManifestSchema`
- `packages/oep-distribution/src/` — `oep-writer`, `oep-reader`, `install-coordinator`, `zip-security`
- `packages/storage/src/db.ts`, `course-store.ts` — IndexedDB stores
- `apps/learner/src/courseDownload.ts`, `oepAdapters.ts` — install wiring + OEP→LoadedPackage
- `packages/runtime/src/widgets/SandboxWidgetAdapter.tsx` — srcDoc rendering
- `packages/cli/src/commands/oep-build.ts` — archive building

## 4. Concepts

### 4.1 Device widget plugin

A **widget plugin** is a unit of widget metadata + code installed on a device and available device-wide. It has exactly one runtime form: a **self-contained HTML** document that runs in a sandboxed iframe.

### 4.2 Installed registry

The set of widget plugins currently installed on the device. It is represented in the resolver as a `ResolverCatalog` with `registryId: 'installed'`. Courses reference it via `source: 'registry', registryId: 'installed'`.

### 4.3 Exact versions and integrity

As with the ecosystem spec: authoring locks an exact widget version and integrity; a course must not silently change behavior because a new version was installed. Integrity is verified over the manifest bytes (course-pinned) and over the document bytes (`artifact.documentIntegrity`), all unchanged from today.

## 5. The `.oep` widget package

A widget `.oep` is a normal Open-Edu archive whose `course/` content root contains a widget package:

```text
widget-package.oep
└── course/
    ├── widget.manifest.json      # WidgetManifestSchema, format: self-contained-html, offline: true
    ├── index.html                # the widget document (bytes verified by documentIntegrity)
    ├── schema/
    │   └── config.schema.json    # optional config schema
    ├── icon.svg                  # optional
    └── docs/                     # optional
```

Notes:

- `oep:build` already bundles every non-ignored file, so a directory laid out this way builds without new archive logic. We add explicit widget-mode support to `oep:build` for validation and ergonomics (see §9).
- The reader/installer already preserves all non-metadata files as stored bytes, so `index.html` and `schema/config.schema.json` survive extraction without new reader logic.
- The installed document is **self-contained**: all JS/CSS inlined. Size is governed by the existing widget policy limits (2 MiB self-contained document budget).
- `WidgetManifestSchema` requires `format: 'self-contained-html'` for offline; we require it for device installs.

## 6. Device widget store (IndexedDB)

Add a `widgets` object store to the existing `open-edu` database (`packages/storage/src/db.ts`), parallel to `courses`/`bundles`. A stored record:

```ts
interface StoredWidget {
  id: string; // publisher-domain.widget-name
  version: string; // exact semver
  manifest: WidgetManifest; // parsed + verified
  indexHtmlBytes: ArrayBuffer; // self-contained document, verified by manifest.artifact.documentIntegrity
  configSchema?: unknown; // parsed from schema/config.schema.json if present
  downloadedAt: string;
  enabled: boolean; // enable/disable toggle
  distributionMeta?: DistributionMeta; // optional checksum/metadata from install source
}
```

New module `packages/storage/src/widget-store.ts` with functions (mirroring `course-store.ts`):

- `saveWidget(record): Promise<void>` — inserts; rejects an existing same-or-newer version (version semantics below).
- `getWidget(id): Promise<StoredWidget | undefined>`
- `listWidgets(): Promise<StoredWidget[]>`
- `replaceWidget(record): Promise<void>` — update flow; rejects `VERSION_DOWNGRADE` and `VERSION_SAME` analogously to courses (`courseDownload.ts`).
- `deleteWidget(id): Promise<void>`
- `setWidgetEnabled(id, enabled): Promise<void>`

Versioning semantics mirror courses: installing an older version over a newer one is rejected (`VERSION_DOWNGRADE`), installing the same version is rejected (`VERSION_SAME`), reinstalling is an explicit update.

## 7. Installation and lifecycle

### 7.1 Install flow

Reuse the existing install machinery with a widget-specific interpretation:

1. Read bytes from `CourseSource` (URL proxy or catalog download).
2. Run through `OepReader` + ZIP security (archive/decompressed size, path traversal, checksum) — unchanged.
3. Locate the widget package under the content root: require `widget.manifest.json` and `index.html`.
4. Parse + validate `WidgetManifestSchema`; require `format: 'self-contained-html'` and `distribution.offline: true`.
5. Verify `index.html` bytes against `manifest.artifact.documentIntegrity` (and `sizeBytes`).
6. Parse optional `schema/config.schema.json` if the manifest declares `schemas.configUrl`-equivalent local schema.
7. `saveWidget`/`replaceWidget` into the `widgets` store.

A small `InstallWidgetCoordinator` (in `oep-distribution` or a learner-level module) wraps these steps, returning an `InstallResult` compatible with the existing error mapping keyed by error codes (`ARCHIVE_TOO_LARGE`, `CHECKSUM_MISMATCH`, `VERSION_DOWNGRADE`, `VERSION_SAME`, `COURSE_VALIDATION_ERROR`, …).

### 7.2 Management UI

Add a "Widgets / Plugins" managed list (parallel to installed courses):

- List installed widgets (id, version, publisher, status, enabled state).
- **Enable/disable** — toggles the `enabled` flag; the resolver reads it at resolution time (no restart).
- **View details** — manifest info, integrity, format.
- **Uninstall** — `deleteWidget(id)`; uninstalling must not affect other courses that reference shared built-ins (installed widgets are never embedded in a course, so this is inherently safe for courses).
- **Install from URL** — reuse the existing install-from-URL dialog.
- **Install from catalog** — extend the existing catalog install view so a catalog entry can describe a widget artifact; behavior mirrors `CatalogInstallView`.

## 8. Resolution: `installed://` transport

### 8.1 Assembling the installed catalog

When the learner initializes widget resolution (in `CourseRuntime`, or ideally a store-change-refresh), assemble an installed catalog:

```ts
function buildInstalledCatalog(records: StoredWidget[]): ResolverCatalog {
  const widgets = new Map<string, CatalogWidgetMeta>();
  for (const r of records.filter((w) => w.enabled)) {
    widgets.set(`${r.id}@${r.version}`, {
      id: r.id,
      version: r.version,
      manifestUrl: `installed://${r.id}/${r.version}/manifest.json`,
      status: r.manifest.status,
      trustTier: 'sandboxed',
      offline: true,
    });
  }
  return { registryId: 'installed', origin: 'installed://widgets', widgets };
}
```

The installed catalog is merged into the `catalogs` map passed to `createWidgetResolver` alongside any remote catalogs.

### 8.2 The `installed://` fetch shim

`CourseRuntime.tsx` currently injects resolver options; we add a `fetchImpl` that intercepts `installed://` URLs and returns bytes directly from the IndexedDB `widgets` store (no network):

```ts
function makeInstalledFetchImpl(store: WidgetStore) {
  return async (url: string, init) => {
    if (!url.startsWith('installed://')) return fetch(url, init);
    // parse installed://<id>/<version>/{manifest.json|index.html}
    const widget = await store.getWidget(id, version); // 404-like if missing/disabled
    if (path.endsWith('manifest.json')) {
      // rewrite artifact.documentUrl → installed://<id>/<version>/index.html for local serving
      return jsonResponse({
        ...widget.manifest,
        artifact: {
          ...widget.manifest.artifact,
          documentUrl: `installed://${id}/${version}/index.html`,
        },
      });
    }
    return byteResponse(widget.indexHtmlBytes);
  };
}
```

Because the resolver fetches `entry.manifestUrl` through `fetchImpl`, the manifest fetch, integrity verification, `artifact.documentIntegrity` verification, capability gating, status/experimental policy, and `srcDoc` sizing all keep working with **zero changes to `widget-resolver.ts` resolve() logic**.

**Document-URL rewriting (important).** `WidgetManifestSchema` requires `artifact.documentUrl` to be HTTPS and non-loopback (community-widget-manifest.ts:17-36), so a stored manifest cannot carry an `installed://` URL. To keep the document fetch on-device without a network call, the shim **rewrites the manifest on the way out**: when the resolver requests `installed://<id>/<ver>/manifest.json`, the shim reads the stored `StoredWidget.manifest` and returns a clone with `artifact.documentUrl` rewritten to `installed://<id>/<ver>/index.html`. The resolver's subsequent document fetch therefore returns to the shim and yields the verified IndexedDB bytes. Key properties:

- The **stored/authenticated manifest is unchanged** — it keeps its canonical HTTPS `documentUrl`, so `WidgetManifestSchema` validation and the course-pinned manifest-integrity check both hold over the canonical document.
- The rewritten form exists only transiently inside the shim's response and is never persisted.
- `localRegistryDocumentUrl` (the loopback `/manifest.json` → `/index.html` fallback) does not apply to `installed://`; our shim handles document resolution itself.

Reference: the resolver already threads the injected fetch through `fetchBytes(entry.manifestUrl, …)` (widget-resolver.ts:157) and `fetchBytes(manifest.artifact.documentUrl, …)` (widget-resolver.ts:285). The `curl` of install also sets `manifest.distribution.offline` (true), which routes the document through the cache-and-fetch path that supports local bytes.

### 8.3 Course reference

A course node references an installed widget with the **existing, unchanged** schema:

```json
{
  "type": "custom",
  "title": "My Installed Widget",
  "widgetRef": {
    "id": "community.example.counter",
    "version": "1.0.0",
    "source": "registry",
    "registryId": "installed",
    "integrity": "sha256-<manifest-digest>"
  },
  "config": { "...": "..." }
}
```

The `registry` source already requires `integrity` and `registryId` (widget-reference.ts:20-34). No schema change.

### 8.4 Rendering

Resolution returns the `sandboxed` tier with `srcDoc` (decoded self-contained HTML), which `SandboxWidgetAdapter` renders as an opaque-origin iframe with `sandbox="allow-scripts"`, `referrerPolicy="no-referrer"`. The self-contained CSP (inline `script-src 'sha256-…'`) from the ecosystem spec applies via the document's meta CSP. Host-authority invariants (completion/score/state/telemetry only via host) are enforced exactly as for community widgets.

### 8.5 Policy

Installed widgets are treated as the `registry` source with the **local** trust expectations already used for loopback/dev catalogs:

- `registryCatalogOrigins` allowlist: the shim reports the installed origin as allowed internally (it is not a network origin). Because all traffic is local in-memory, normal HTTPS-origin policy is bypassed deliberately; integrity still gates trust.
- `experimentalWidgets`: installed experimental widgets follow the same policy as other local catalogs (allow in dev/local contexts; configurable for prod) — defaulting to allow-local, mirroring `allowLocalExperimental` (CourseRuntime.tsx:74-81).
- Artifact-size / srcDoc-size and ready-timeout budgets unchanged.

## 9. Authoring and tooling

- **`oep:build`**: add an explicit widget-package mode (`edu oep:build --widget`) that (a) validates `widget.manifest.json` + `index.html` presence and format, and (b) folds the widget files into the archive. Without `--widget`, a directory containing `widget.manifest.json` is recognized and validated so the existing pass-through already produces a correct artifact.
- **Studio / AI authoring**: resolve installed-widget IDs against the installed catalog for discovery and config validation; write exact version + integrity on export; warn if a referenced widget is a device-installed widget (so a course exported elsewhere resolves against its own catalog).
- **Docs**: document the device-install flow, the `.oep` widget package layout, the `installed://` registryId convention, and the single self-contained-html format.

## 10. Data flow

```text
Install widget .oep (URL/catalog)
  → OepReader + ZIP security
  → extract widget package (widget.manifest.json + index.html + schema)
  → validate WidgetManifestSchema (self-contained-html, offline:true)
  → verify index.html bytes (documentIntegrity/sizeBytes)
  → saveWidget → IndexedDB widgets store

Course render
  → CourseRuntime assembles installed catalog from listWidgets() (enabled)
  → createWidgetResolver({ fetchImpl: installedFetchImpl, catalogs: { installed, …remote } })
  → node widgetRef { source:'registry', registryId:'installed', id, version, integrity }
  → resolver.resolve →
      fetchWidgets('installed://<id>/<ver>/manifest.json') via shim → IndexedDB bytes
      → verify manifest integrity → validate → policy/capability gating
      → fetch document via shim (offline path) → verify documentIntegrity
      → tier sandboxed, srcDoc = decoded HTML
  → SandboxWidgetAdapter renders opaque-origin sandboxed iframe
  → host authorizes completion/state/telemetry
```

## 11. Error handling and failure behavior

| Failure                                                                | Behavior                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Invalid widget `.oep` / missing `widget.manifest.json` or `index.html` | Reject install with `COURSE_VALIDATION_ERROR`-style mapped error                    |
| Manifest invalid / not `self-contained-html`                           | Reject install; do not store                                                        |
| Document integrity mismatch                                            | Never store/execute; mark failed                                                    |
| Version downgrade / same                                               | Reject with `VERSION_DOWNGRADE` / `VERSION_SAME`                                    |
| Widget disabled / missing at resolve time                              | `unavailable`-style failure → fallback or localized error (unchanged resolver path) |
| Oversized artifact                                                     | Reject per existing size limits                                                     |
| Archive security failure                                               | Reuse existing ZIP-security failures                                                |

## 12. Security model

Same invariants as the ecosystem spec, now at device level:

- Installed widget code runs only in a sandboxed iframe (`allow-scripts`, no `allow-same-origin`, opaque origin for srcDoc).
- Integrity is mandatory: course bytes-pinned manifest digest + `artifact.documentIntegrity` over the document.
- The `installed://` transport is in-memory only and never crosses the network; the shim returns data only from the local `widgets` store.
- Enable/disable is honored at resolution time; a disabled or uninstalled widget simply fails resolution and falls back.
- Widget can never mutate host progress/state/rewards directly; all such actions go through host message validation.
- No host asset broker; self-contained HTML has no relative subresource dependencies.

## 13. Testing strategy

### Unit (Vitest)

- `widget-store` CRUD + version semantics (`VERSION_DOWNGRADE`, `VERSION_SAME`, update).
- Installed-catalog assembly from records (enabled filter, id@version keying, manifestUrl shape).
- `installed://` fetch shim: manifest + document byte routing, missing/disabled widget → 404-like.
- End-to-end resolver with injected shim: resolve → verified sandboxed srcDoc; integrity mismatch → failure; experimental/disabled → policy/unavailable.
- `oep:build --widget` validation (missing/malformed widget package).

### Browser / E2E (Playwright)

1. Install a widget `.oep` from URL.
2. Confirm it appears in the Widgets/Plugins management list.
3. Load a course/mock node referencing that widget by `registryId:'installed'`; verify the sandboxed widget renders.
4. Disable the widget; confirm the course falls back / shows unavailable.
5. Uninstall; confirm the course no longer resolves it.
6. Confirm the widget iframe cannot access host storage or navigate the top page (already covered patterns).

## 14. Acceptance criteria

- An end user can install a widget `.oep` from a URL or catalog entry with no build step and no server restart.
- An installed widget is available to **any** course by `source:'registry', registryId:'installed'` + exact version + integrity.
- Exactly one widget format: self-contained HTML rendered in a sandboxed iframe via `srcDoc`.
- Widgets are resolved entirely from IndexedDB at runtime; no new service, no restart, no network fetch for installed documents.
- Enable/disable and uninstall take effect on the next resolution (no restart).
- Version downgrade/same are rejected; updates go through the existing install path safely.
- The resolver's integrity, capability, status, policy, and caching behavior are unchanged for community/built-in widgets.
- All user-facing strings are internationalized via `t()` / `packages/i18n/locales/en/`.

## 15. Non-goals re-confirmed

- No native/trusted execution tier for installed widgets.
- No multi-file asset serving for installed widgets.
- No course-embedded widget executable code.
- No schema changes to `WidgetReference`.
- No new network service.
