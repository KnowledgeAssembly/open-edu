# Phase 4 — Governance, Instance Registry, and E2E

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an administrator install a widget package into a self-hosted instance catalog, revoke it, optionally verify publisher signatures, run automated protocol/size/CSP checks, and prove isolation with Playwright.

**Architecture:** Installation is an admin operation on the instance, not a course unzip of JS. The registry stores immutable versioned artifacts and publishes `catalog.json` + `manifest.json` + `index.html`. The learner still only loads the served `index.html` URL or a verified srcdoc. Signatures are optional; unsigned `verified` status is rewritten to `experimental` (already in Phase 2 resolver).

**Tech Stack:** TypeScript, Vitest, Playwright, Node `crypto` for signatures

**Depends on:** Phase 2 (Phase 3 recommended for Studio install UX).

**Index:** [`2026-08-15-runtime-community-widget-ecosystem-index.md`](./2026-08-15-runtime-community-widget-ecosystem-index.md)

---

## File Map

| File                                                            | Responsibility                                                        |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/widgets/src/install/validate-package.ts`              | Manifest + artifact + CSP + size                                      |
| `packages/widgets/src/install/signatures.ts`                    | Optional publisher signature verify                                   |
| `apps/dev-server/src/widget-registry/store.ts`                  | Immutable version store (filesystem)                                  |
| `apps/dev-server/src/widget-registry/routes.ts`                 | catalog + manifest + document routes                                  |
| `docs/superpowers/specs/widget-registry-operator-runbook.md`    | Operator runbook (this is requested operational docs for the feature) |
| `docs/superpowers/specs/community-widget-contribution-guide.md` | Contribution guide                                                    |
| `tests/e2e/community-widget.spec.ts`                            | Isolation + persist + revoke + offline                                |

Skip OpenWiki generated pages. Contribution guide lives under `docs/superpowers/specs/` as companion docs for this epic.

---

### Task 1: Package validation

**Files:**

- Create: `packages/widgets/src/install/validate-package.ts`
- Create: `packages/widgets/src/install/validate-package.test.ts`

Input: directory or `{ manifestJson: unknown, documentBytes: Uint8Array, archiveBytes?: Uint8Array }`.

Checks:

1. `WidgetManifestSchema.parse`
2. `documentIntegrity` matches `documentBytes`
3. `sizeBytes` matches and `<= policy.maxArtifactBytes`
4. If archive present, `archiveIntegrity` matches
5. Document contains CSP meta **or** caller supplies equivalent header string; must include `connect-src 'none'` and `frame-src 'none'`
6. Self-contained: no `src="./` relative subresources in HTML (regex on `src=` / `href=` that are not `data:` or absolute https)
7. Budget: record `violations: string[]` (ready timeout cannot be measured here — mark `size` only)

Returns `{ ok: true, manifest }` or `{ ok: false, errors: string[] }`.

- [ ] Commit `feat(widgets): validate community widget packages before publish`

---

### Task 2: Optional publisher signatures

**Files:**

- Create: `packages/widgets/src/install/signatures.ts`
- Create: `packages/widgets/src/install/signatures.test.ts`

Use Ed25519 via `crypto.verify` / `crypto.sign` (Node). Manifest field:

```ts
signature?: { alg: 'ed25519'; publicKey: string; value: string }
```

Canonical signed payload = UTF-8 bytes of `id + '\n' + version + '\n' + artifact.documentIntegrity`. Test: valid signature verifies; tampered integrity fails. Resolver: if signature missing, force `status` to `experimental` when claimed `verified`.

- [ ] Commit `feat(widgets): verify optional ed25519 widget publisher signatures`

---

### Task 3: Instance registry store + routes

**Files:**

- Create: `apps/dev-server/src/widget-registry/store.ts`
- Create: `apps/dev-server/src/widget-registry/store.test.ts`
- Create: `apps/dev-server/src/widget-registry/routes.ts`
- Create: `apps/dev-server/src/widget-registry/routes.test.ts`

Filesystem layout under `OPEN_EDU_WIDGET_REGISTRY` (default `.openedu-widget-registry/` gitignored):

```text
{publisher}/{widget}/{version}/manifest.json
{publisher}/{widget}/{version}/index.html
{publisher}/{widget}/{version}/artifact.zip
catalog.json
```

API (StudioAPI or Vite middleware — follow existing `apps/dev-server/src` server patterns; search `app.post` / `StudioAPI`):

- `POST /widget-registry/install` (admin) — validate, write immutable dir, refuse overwrite of same version
- `GET /widget-registry/catalog.json` — respond with `Cache-Control: max-age=3600, must-revalidate` so online learners see revocations within one hour
- `GET /widget-registry/:publisher/:widget/:version/manifest.json`
- `GET /widget-registry/:publisher/:widget/:version/index.html` with CSP header = `MULTI_FILE_CSP` or self-contained variant
- `GET /widget-registry/:publisher/:widget/:version/artifact.zip` — return **403 Forbidden** for all non-admin origins; if admin auth is not yet implemented, return 404 with body `{"error":"archive download not available"}`
- `POST /widget-registry/:id/:version/revoke`

Operations: enable, disable, deprecate, revoke. Disable = omit from catalog resolution for new courses; revoke = status revoked + cache invalidation signal file `revoked.json`.

Tests:

- `GET /widget-registry/catalog.json` response includes `Cache-Control: max-age=3600`
- `GET /widget-registry/:publisher/:widget/:version/artifact.zip` from a non-admin request returns 403 or 404 (not the zip bytes)

Serve documents from a **path prefix**, not the learner app cookie origin if the dev-server already has a host split; if not, document that production must use a dedicated widget origin. Tests use the filesystem store without HTTP if routing is hard to boot in unit tests; add one HTTP test if the existing dev-server test harness already starts the server.

- [ ] Gitignore `.openedu-widget-registry/`
- [ ] Commit `feat(dev-server): add instance widget registry install and catalog routes`

---

### Task 4: Automated verification job

**Files:**

- Create: `packages/widgets/src/install/verify-suite.ts`
- Create: `packages/widgets/src/install/verify-suite.test.ts`

`runWidgetVerification(documentHtml: string)` returns:

```ts
{
  protocol: boolean; // HTML references open-edu.widget/1
  sizeOk: boolean;
  cspOk: boolean;
  noAllowSameOrigin: boolean; // iframe snippet in docs if any
}
```

This is static analysis, not a browser. Playwright protocol tests live in Task 6.

- [ ] Commit `feat(widgets): add static community widget verification suite`

---

### Task 5: Contribution guide + operator runbook

**Files:**

- Create: `docs/superpowers/specs/community-widget-contribution-guide.md`
- Create: `docs/superpowers/specs/widget-registry-operator-runbook.md`

Contribution guide must include: package layout, protocol messages, CSP, self-contained offline build, capability list, “React not required”, never call host APIs.

Runbook must include: install, enable/disable/revoke, origin allowlist, 7-day offline grace, dedicated widget origin, integrity pinning in courses.

- [ ] Commit `docs: add community widget contribution guide and registry runbook`

---

### Task 6: Playwright E2E

**Files:**

- Create: `tests/e2e/community-widget.spec.ts`

Use the existing Playwright harness (`pnpm test:e2e:install` once). Serve the counter example via the instance registry fixture.

Cases (map to spec §17):

1. Install package into registry store (Node helper, not UI)
2. Catalog lists the widget
3. Course with `widgetRef` loads iframe (`[title="Interactive widget: community.example.counter"]` or `data-testid="sandbox-widget-frame"`)
4. Complete activity, reload, state persists (`data-testid` on counter)
5. `page.evaluate(() => window.localStorage)` from inside iframe must throw or be opaque — use `frame.evaluate`; expect no learner `localStorage` keys written by the widget
6. `frame.evaluate(() => window.top.location.href)` must not navigate the parent; parent URL unchanged
7. Offline: route.abort all widget origin requests after cache fill; self-contained widget still loads
8. Revoke + online → widget unavailable
9. CSP: document must not load `https://evil.example/x.js` — intercept requests, expect zero
10. Idle unmount: navigate away and back; state restored from host
11. Day-7 grace: revoke the widget while offline; reload immediately — self-contained widget still loads from cache. Day-8 hard-block: call `await page.clock.setFixedTime(revokedAt + 8 * 24 * 3600 * 1000)` (Playwright built-in clock API) then reload — expect widget unavailable error state. The `WidgetArtifactCache` and `WidgetResolver` accept an injectable `now?: () => number` parameter (already present from Phase 2 Task 4); the E2E test must override this via the learner app's `window.__OPEN_EDU_NOW__` hook or equivalent test seam. Do not use `setTimeout` or `sleep` to simulate time.

Add `data-testid="sandbox-widget-frame"` on the iframe in `SandboxWidgetAdapter` if missing.

Do not implement malware, exploits, or PoCs. Tests only assert isolation properties of **this** app.

- [ ] Run: `pnpm test:e2e tests/e2e/community-widget.spec.ts`
- [ ] Commit `test(e2e): cover sandboxed community widget isolation and persistence`

---

### Task 7: Acceptance checklist (manual + automated)

Walk spec §19. Each line must map to a passing test or an explicit follow-up issue. Do not claim Phase 4 complete until:

```bash
pnpm --filter @open-edu/schemas test
pnpm --filter @open-edu/widget-sdk test
pnpm --filter @open-edu/widgets test
pnpm --filter @open-edu/runtime test
pnpm --filter @open-edu/dev-server test
pnpm test:e2e tests/e2e/community-widget.spec.ts
```

all pass.

---

## Spec self-review (planner)

| Spec requirement                            | Task                                                                                                                                                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Instance install without rebuilding learner | P4 T3                                                                                                                                                                                                                                                          |
| Signatures + revocation                     | P4 T2–T3                                                                                                                                                                                                                                                       |
| Automated a11y/protocol/size/security       | static suite P4 T4; a11y host-shell axe already Phase 1/2; full a11y of iframe content is widget-owned                                                                                                                                                         |
| E2E 1–12                                    | P4 T6 (low-end-device profile is optional Playwright `slowMo` / CPU throttling — add `browser.newContext` CDP `Emulation.setCPUThrottlingRate` only if the existing e2e helper supports CDP; otherwise skip rate 12 as a documented follow-up, do not fake it) |
