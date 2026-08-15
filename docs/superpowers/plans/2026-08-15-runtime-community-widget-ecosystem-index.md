# Runtime Community Widget Ecosystem — Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a registry-backed, sandboxed community widget platform while keeping built-in widgets and existing course packages unchanged.

**Architecture:** Native widgets stay in the host React realm. Community widgets load as cross-origin iframes (`sandbox="allow-scripts"`) and talk to the host through a versioned, schema-validated protocol. The host owns state, completion, telemetry, rewards, capabilities, and lifecycle. Exact widget version + integrity are pinned in the course package.

**Tech Stack:** TypeScript 5.x, Zod 3.x, Vitest 1.x, React 18.x, Playwright 1.x, IndexedDB, iframe `postMessage`

**Spec:** [`docs/superpowers/specs/2026-08-14-runtime-community-widget-ecosystem-design.md`](../specs/2026-08-14-runtime-community-widget-ecosystem-design.md)

---

## Design review (current vs spec)

These are facts about the repo as of 2026-08-15. Implementers must not “fix” them by executing community JS in the host realm.

| Surface                                 | Today                                                                   | Spec target                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/widgets/src/remote-loader.ts` | Fetches JS, optional integrity, `import(blobUrl)` in the **host realm** | Trusted-remote only; disabled by default in public learner builds                |
| Integrity                               | Optional; strips `sha256-` then compares **hex**                        | Mandatory for registry refs; canonical `sha256-` + 64 lowercase hex of raw bytes |
| `apiVersion`                            | Unchecked string                                                        | Exact match: trusted-remote `1.0.0`; sandbox `open-edu.widget/1`                 |
| Permissions                             | Declarative, unused                                                     | Capability broker; widget cannot self-grant                                      |
| `WidgetRenderer` `emitInteraction`      | `console.debug` only                                                    | Normalize into `widget_interaction` via host telemetry                           |
| Fallback answers                        | Save **fallback** `widgetId` only                                       | `WidgetAnswerProvenance` with intended vs rendered + `renderedViaFallback`       |
| `remoteWidget`                          | Optional on `custom` nodes; URL embedded in content                     | Normalize to `WidgetReference`; new refs pin manifest integrity                  |
| Catalog                                 | Built-ins via `WIDGET_CATALOG_ENTRIES`                                  | Union of native + registry + instance catalog                                    |
| CSP                                     | No learner `frame-src` policy                                           | Learner allows configured widget origins; widget documents ship baseline CSP     |
| Demo                                    | `examples/remote-widget-demo` uses `window.React`                       | Framework-agnostic SDK bootstrap                                                 |

### Locked decisions (do not reopen during implementation)

1. **Trust tiers:** `native` (default on), `sandboxed` (default on), `trusted-remote` (default **off**). A course cannot grant itself host privileges.
2. **Integrity string:** `/^sha256-[a-f0-9]{64}$/` over the exact bytes being verified (manifest bytes for course-pinned integrity; iframe document bytes for `artifact.documentIntegrity`).
3. **No `allow-same-origin`** in protocol v1. No host asset broker. Multi-file widgets resolve subresources only at the verified registry origin.
4. **Offline:** `distribution.offline: true` requires `artifact.format: 'self-contained-html'`.
5. **Protocol v1 capabilities:** `resize`, `telemetry-interaction`, `state-persistence`, `locale`, `theme`, `hints`, `observe-mode`. `capability:request` / `capability:result` exist as extension points but **no v1 capability uses them**.
6. **Native `WidgetCapabilities` (V2 metadata)** and **protocol `WidgetCapability`** are different types. Do not merge them.
7. **Schemas are the source of truth.** `@open-edu/widget-sdk` re-exports protocol types from `@open-edu/schemas`. `@open-edu/widgets` may depend on the SDK for shared types; it remains the native React package.
8. **Duplicate `RemoteWidgetManifest`:** keep Zod in `@open-edu/schemas`; widgets import the type from schemas (stop hand-maintaining a parallel interface after Phase 0 Task 2).
9. **Instance registry HTTP upload** is Phase 4. Phase 2 ships static `catalog.json` loading and resolver policy.

### Out of scope (spec non-goals)

Marketplace, billing, social community, npm install at runtime, host-DOM widgets, server-side widget integrations, executing arbitrary third-party JS in the learner realm.

---

## Phase plans

| Phase | Plan                                                                                                                 | Ships independently                                                                                                                         |
| ----- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** | [`2026-08-15-community-widget-phase0-harden-remote.md`](./2026-08-15-community-widget-phase0-harden-remote.md)       | Trust-tier policy, integrity/apiVersion/origin/size/timeout for trusted-remote, telemetry bridge, provenance on fallback answers            |
| **1** | [`2026-08-15-community-widget-phase1-sdk-protocol.md`](./2026-08-15-community-widget-phase1-sdk-protocol.md)         | `@open-edu/widget-sdk`, canonical `WidgetManifest` + protocol schemas, sandbox adapter behind flag, one vanilla example, local dev registry |
| **2** | [`2026-08-15-community-widget-phase2-resolver-cache.md`](./2026-08-15-community-widget-phase2-resolver-cache.md)     | `WidgetResolver`, static catalogs, IndexedDB cache, reference normalization, config validation, fallback transforms, revocation grace       |
| **3** | [`2026-08-15-community-widget-phase3-studio-authoring.md`](./2026-08-15-community-widget-phase3-studio-authoring.md) | Studio catalog + sandbox preview, JSON Schema config, export pins version+integrity, AI catalog guard                                       |
| **4** | [`2026-08-15-community-widget-phase4-governance.md`](./2026-08-15-community-widget-phase4-governance.md)             | Instance install API, signatures, revocation, automated verification, contribution guide + operator runbook, E2E suite                      |

```text
Phase 0 → Phase 1 → Phase 2 → Phase 3
                              ↘ Phase 4 (can overlap late Phase 3)
```

Do not start Phase 1 until Phase 0 tests pass: existing courses and built-ins must still run, and trusted-remote must be off by default.

---

## File map (all phases)

### New packages / files

| Path                                                    | Phase | Responsibility                                                    |
| ------------------------------------------------------- | ----- | ----------------------------------------------------------------- |
| `packages/widget-sdk/`                                  | 1     | Framework-agnostic protocol client, validators, harness, fixtures |
| `packages/schemas/src/widget-reference.ts`              | 1     | `WidgetReference` Zod schema                                      |
| `packages/schemas/src/widget-protocol.ts`               | 1     | Message envelope + payload schemas                                |
| `packages/schemas/src/widget-policy.ts`                 | 0     | Trust-tier + deployment policy schema                             |
| `packages/widgets/src/policy.ts`                        | 0     | Policy helpers used by the remote loader                          |
| `packages/widgets/src/integrity.ts`                     | 0     | SHA-256 digest + canonical integrity parse/verify                 |
| `packages/widgets/src/resolver/`                        | 2     | Normalize, fetch, verify, select adapter                          |
| `packages/widgets/src/artifact-cache.ts`                | 2     | Memory + IndexedDB verified artifact cache                        |
| `packages/runtime/src/widgets/SandboxWidgetAdapter.tsx` | 1     | Iframe host, message broker                                       |
| `packages/runtime/src/widgets/NativeWidgetAdapter.tsx`  | 2     | Wrap current `WidgetDefinition.render`                            |
| `examples/community-widget-counter/`                    | 1     | Vanilla JS sandboxed widget                                       |
| `apps/dev-server/src/widget-registry/`                  | 4     | Instance catalog + install validation                             |
| `tests/e2e/community-widget.spec.ts`                    | 4     | Playwright isolation + offline + revoke                           |

### Files to modify

| Path                                                   | Phase | Change                                                           |
| ------------------------------------------------------ | ----- | ---------------------------------------------------------------- |
| `packages/schemas/src/widget-manifest.ts`              | 0–1   | Canonical `WidgetManifestSchema`; keep legacy remote schema      |
| `packages/schemas/src/nodes.ts`                        | 1–2   | Additive `widgetRef`; keep `remoteWidget`                        |
| `packages/schemas/src/progress.ts`                     | 0     | Provenance fields on `WidgetAnswerSchema`                        |
| `packages/schemas/src/telemetry.ts`                    | 0     | Controlled `action` enum + `renderedViaFallback` on complete     |
| `packages/widgets/src/remote-loader.ts`                | 0     | Policy, integrity required, timeout, size, origin                |
| `packages/widgets/src/types.ts`                        | 0     | Import manifest type from schemas                                |
| `packages/runtime/src/renderers/WidgetRenderer.tsx`    | 0–2   | Telemetry, provenance, then resolver/sandbox                     |
| `packages/runtime/src/context/RuntimeContext.tsx`      | 0     | `emitTelemetry`                                                  |
| `apps/learner` CSP / config                            | 2     | `frame-src` allowlist from policy                                |
| `examples/remote-widget-demo/`                         | 1     | Migrate off `window.React`                                       |
| `apps/dev-server/src/studio/widgets/curatedCatalog.ts` | 3     | Merge registry catalog                                           |
| `pnpm-workspace.yaml`                                  | 1     | Already includes `packages/*` — no change if package lives there |

---

## Spec coverage matrix

| Spec section                       | Plan tasks                           |
| ---------------------------------- | ------------------------------------ |
| §4 Trust tiers / policy            | P0 T1–T3, P2 policy grants           |
| §5 Manifest / references           | P1 T1–T3, P2 normalize               |
| §6 Public SDK                      | P1 T4–T7                             |
| §7 Protocol / completion / state   | P1 T5–T8, P2 state migration         |
| §8 Capabilities                    | P1 T5, P2 grants                     |
| §9 Resolver / cache / adapters     | P1 sandbox, P2 resolver+cache+native |
| §10 Failure matrix                 | P2 T6–T8                             |
| §11 A11y / theme / locale / resize | P1 adapter + P2 host shell           |
| §12 Studio / AI / catalog          | P3                                   |
| §13 Distribution / offline         | P2 cache, P4 install                 |
| §14 Security / CSP                 | P1 iframe, P2 learner CSP, P4 verify |
| §15 Versioning                     | P1 protocol constant                 |
| §16 Phase 0–4 roadmap              | this index                           |
| §17 Testing                        | each phase + P4 E2E                  |
| §18 Observability                  | P0 diagnostics, P2 load metrics      |
| §19 Acceptance                     | P4 checklist                         |

---

## Acceptance (end of Phase 4)

Matches spec §19. Phase 0 alone must satisfy: built-ins unchanged; existing packages validate; trusted-remote off by default; interactions can reach `widget_interaction`; fallback answers record provenance.

## Explicitly deferred (do not invent during execution)

- Developer-only diagnostics **panel UI** (spec §18): Phase 0/2 record safe diagnostics; a panel is a later story.
- Spec §17 item 12 low-end CPU throttle: only if the existing Playwright helper already exposes CDP; otherwise file a follow-up, do not fake the metric.
- `WidgetManifest.metadata` / `accessibility` remain `z.record` until Studio needs a tighter Zod model (Phase 3 may add JSON Schema from widget packages without changing host types).
