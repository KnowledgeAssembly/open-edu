# Widget Registry Operator Runbook

**Date:** 2026-08-25
**Audience:** Instance operators administering a self-hosted Open-Edu widget registry
**Status:** Companion doc for the community widget ecosystem

**Related docs:**

- [Community Widgets Developer Guide](../../../apps/docs/docs/widgets/community-widgets) — published developer guide for widget authors
- [Community Widget Contribution Guide](./community-widget-contribution-guide.md) — author-side package layout, protocol, and CSP
- [Runtime Community Widget Ecosystem — Technical Design Spec](./2026-08-14-runtime-community-widget-ecosystem-design.md) — full threat model and resolver/cache design

## 1. What the instance registry is

The dev-server implements an instance widget registry that installs immutable, versioned widget artifacts and publishes them through a small catalog API. A learner deployment consumes the catalog and resolves widget documents only from origins it is configured to trust. Code never runs from the registry directly — the learner loads the served `index.html` document into a sandboxed iframe (see the contribution guide).

Implementation surface:

- Store: `apps/dev-server/src/widget-registry/store.ts` (`WidgetRegistryStore`)
- Routes: `apps/dev-server/src/widget-registry/routes.ts` (`POST /widget-registry/install`, `GET /widget-registry/catalog.json`, per-version `manifest.json` / `index.html`, `POST …/revoke`)
- Validation: `packages/widgets/src/install/` (`validateWidgetPackage`, `verify-suite`, `signatures`)
- Resolution: `packages/widgets/src/resolver/widget-resolver.ts`, `packages/widgets/src/artifact-cache.ts`

## 2. Installing a widget package

The registry root is set by the environment variable `OPEN_EDU_WIDGET_REGISTRY`, defaulting to `.openedu-widget-registry/` (gitignored) in the dev-server working directory. On disk each version is an immutable directory:

```text
{publisher}/{widget}/{version}/
├── manifest.json
├── index.html
└── artifact.zip            # optional, retained for admin download/backup
```

Two install paths:

1. **HTTP POST `/widget-registry/install`** (admin). Body: `{ publisher, widgetId, manifestJson, documentBase64 (or documentBytes), archiveBase64? }`. The store validates before writing and **refuses to overwrite an already-installed version** (409).
2. **Place-direct.** Drop the files into the registry directory layout above. The catalog auto-discovers installed versions from disk on the next `GET /widget-registry/catalog.json`.

Install validation (`validateWidgetPackage` from `@open-edu/widgets/install`, wired in `store.ts`) checks, in order:

- `WidgetManifestSchema` parse (id/version/apiVersion/artifact/publisher/capabilities/…)
- `artifact.documentIntegrity` matches the sha256 hex of the uploaded document bytes
- `artifact.sizeBytes` equals the exact byte length **and** is `≤ policy.maxArtifactBytes` (default 2 MiB)
- optional `archiveIntegrity` matches when an archive is uploaded
- document CSP meta (or supplied header) contains both `connect-src 'none'` and `frame-src 'none'`
- self-contained documents have no relative `src`/`href` subresources
- the caller-supplied `publisher`/`widgetId` matches the identity the manifest declares

Published documents are served from `GET /widget-registry/{publisher}/{widget}/{version}/index.html` with the document's CSP mirrored as a response header (`MULTI_FILE_CSP` for multi-file artifacts, the embedded CSP meta for self-contained ones). `artifact.zip` is **not** exposed — the route returns 404/403 for non-admin origins. `.oep` courses reference widgets by ID/version; they never embed widget code.

## 3. Enable / disable / deprecate / revoke

Each installed version has an operational status (`store.ts`, `WidgetRegistryStatus`):

| Operation   | Mechanism                                                                                                              | Learner effect                                                                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`   | default (`manifest.status` unless overridden)                                                                          | Listed in catalog, resolvable                                                                                                                                                                                |
| `disable`   | writes `.status.json` `{ "status": "disabled" }`                                                                       | **Omitted from `catalog.json`** — new resolution/previews fail; already-serving sessions are unaffected                                                                                                      |
| `deprecate` | writes `.status.json` `{ "status": "deprecated" }`                                                                     | **Keeps serving**; catalog entry is labeled `deprecated` so authoring tools can warn                                                                                                                         |
| `revoke`    | `POST /widget-registry/{publisher}/{widget}/{version}/revoke` writes `revoked.json` (or a widget-level `revoked.json`) | Catalog entry retained with `status: revoked` (needed so courses already pinned to it can run the offline grace window); resolver **hard-fails online**; offline cached runs subject to the 7-day grace (§5) |

Details:

- **Disable vs revoke:** disable only stops _new_ resolution from the catalog — a course that already pinned the widget can still resolve it via its verified cache/artifact while it remains installed. Revoke is the emergency control: it signals cache invalidation and blocks execution online.
- **Catalog freshness:** `GET /widget-registry/catalog.json` (and manifest responses) send `Cache-Control: max-age=3600, must-revalidate` (`routes.ts`). Online learners revalidate within an hour, so a revocation/disable is visible to them within ~1 hour; offline devices fall back to the grace policy below.
- **Status policy:** a verify-suite demotes unsigned manifests that claim `status: "verified"` to `experimental` at resolve time (`widget-resolver.ts`); deployments with `experimentalWidgets: 'deny'` (the default) refuse to run them.

## 4. Origin allowlist and the dedicated widget origin

The learner loads widget manifests and documents only from origins it is configured to trust. In `apps/learner/src/CourseRuntime.tsx` the policy is built from the comma-separated `OPEN_EDU_WIDGET_ORIGINS` (also accepted as `VITE_OPEN_EDU_WIDGET_ORIGINS`) env var, wired into:

- `policy.allowedOrigins` — trusted origins for widgets/URLs
- `policy.registryCatalogOrigins` — the exhaustive list of origins the resolver may fetch `manifest.json` from

`registryCatalogOrigins` is enforced in `widget-resolver.ts`: the resolver refuses to fetch a manifest from any origin not in the list **before** attempting the network request, then also verifies the course-pinned manifest integrity. For multi-file documents, the document origin must equal the manifest origin (`document-origin-not-allowed` otherwise). Catalog files are validated by `WidgetCatalogFileSchema`, which requires `https:` for the catalog and every `manifestUrl`.

**Production must use a dedicated widget origin.** Widget documents must be served from a separate origin (or at least a path prefix) — never the learner app origin with its cookies — and must be HTTPS public hosts. `WidgetPolicySchema` (`packages/schemas/src/widget-policy.ts`) rejects loopback/`.localhost`/`.local` for `allowedOrigins` and `registryCatalogOrigins`, so production config can't accidentally allow `http://localhost`.

**Development** may use `http://localhost` loopback (the widget-sdk dev registry and dev-server default to localhost origins), but the policy schema rejects those values — so dev wiring constructs an explicit dev policy object directly (not parsed through `WidgetPolicySchema`) to allow the loopback default. See `packages/widget-sdk/src/dev-registry.ts` (`relaxedOrigins`) and the unit harness in `apps/dev-server/src/widget-registry/routes.test.ts`.

## 5. The 7-day offline grace after revocation

Revocation is checked against both the fetched manifest and the cached manifest (`WidgetResolver` + `WidgetArtifactCache`):

- **Online:** a revoked manifest hard-fails (`failure: 'revoked'`). New execution is blocked regardless of cache.
- **Offline (revoked, cached):** the resolver stores `revokedAt` on the cache entry. A previously verified cached artifact still runs while `now - cachedAt <= 7 days` (the window is measured from when the artifact was cached, `widget-resolver.ts` `7 * DAY`). After the 7-day window, or on the first successful online check, the widget is hard-blocked (`revoked-offline-grace-expired`).
- The cache (`packages/widgets/src/artifact-cache.ts`, `createWidgetArtifactCache`) re-verifies stored bytes against the document integrity on every hit, and repopulates from the network (with integrity verification) on a miss.

Operationally: revoking a widget means an offline learner can keep using the already-cached artifact for at most 7 days past revocation, then it becomes unavailable. To force earlier removal, clear the artifact cache on learners (or ship an app update) — the resolver will otherwise keep honoring the cached document within the grace window.

## 6. Integrity pinning in courses

Courses reference widgets through `widgetRef` — never a live URL. A registry reference is:

```ts
{
  id: "community.example.counter",
  version: "1.0.0",
  source: "registry",
  registryId: "<deployment-configured logical registry id>",
  integrity: "sha256-<64 hex of the manifest bytes>",  // pinned manifest hash
}
```

Key rules (`packages/schemas/src/widget-reference.ts`, `toExportedWidgetRef` in `apps/dev-server/src/studio/widgets/widgetRefExport.ts`):

- Authoring tools may select a version range, but **export writes the exact `version` and the manifest-integrity hash** (the Studio export helper `toExportedWidgetRef` refuses to export a registry widget without integrity).
- The resolver verifies the pinned `integrity` over the fetched **manifest bytes before parsing** the manifest (`widget-resolver.ts`), then verifies `artifact.documentIntegrity` over the exact document bytes **before mounting** the iframe.
- A course can silently change behavior between publish and runtime if a new widget version slips in — that is exactly what pinning prevents. Upgrading a course is a deliberate re-export plus re-pin.

## 7. Operational checklist

- `.openedu-widget-registry/` is gitignored and never deployed from source.
- `OPEN_EDU_WIDGET_REGISTRY` points at a stable, durable filesystem path for the instance.
- Widget documents are served from a dedicated widget origin that is in both `allowedOrigins` and `registryCatalogOrigins` of the learner deployment.
- Production origins are HTTPS public hosts (loopback config is dev-only).
- Revocations are made via `revoke` (writes `revoked.json`); remember the catalog `Cache-Control` semantics mean online learners catch up within an hour and offline learners have 7 days of cached grace.
- Courses are exported with pinned `version` + `integrity`; spot-check that no `widgetRef` contains a bare URL.
