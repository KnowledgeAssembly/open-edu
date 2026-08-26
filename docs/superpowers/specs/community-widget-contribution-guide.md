# Community Widget Contribution Guide

**Date:** 2026-08-25
**Audience:** Community developers authoring sandboxed widgets for the Open-Edu runtime
**Status:** Companion doc for the community widget ecosystem

**Related docs:**

- [Community Widgets Developer Guide](../../../apps/docs/docs/widgets/community-widgets) — published developer guide for building, publishing, and installing community widgets
- [Widget Registry Operator Runbook](./widget-registry-operator-runbook.md) — installing, enabling, and revoking widgets on an instance
- [Runtime Community Widget Ecosystem — Technical Design Spec](./2026-08-14-runtime-community-widget-ecosystem-design.md) — full protocol and security model

## 1. What a community widget is

A community widget is a **self-contained web document** served inside a sandboxed `<iframe>` and spoken to through a versioned `postMessage` protocol (`open-edu.widget/1`). The host owns all pedagogical authority: it validates every message, persists state, records telemetry, grants capabilities, and decides when a node completes. The widget only renders and reports intent.

Widget code never runs in the learner application's JavaScript realm. The iframe is created with `sandbox="allow-scripts"` (no `allow-same-origin`, no top-level navigation), `referrerpolicy="no-referrer"`, and `loading="lazy"` — see `packages/runtime/src/widgets/SandboxWidgetAdapter.tsx`.

The **canonical example** is `examples/community-widget-counter/`. It is a vanilla, dependency-free counter widget: read its `widget.manifest.json`, `schema/*.json`, and the built `dist/index.html` alongside this guide.

## 2. Package layout

A widget ships as a small package:

```text
widget-package/
├── widget.manifest.json          # required — validates against WidgetManifestSchema
├── dist/
│   └── index.html                # the iframe document
│       # self-contained: everything inlined (inline <script>, <style>)
│       # multi-file: index.html + sibling assets (widget.js, widget.css, …)
├── schema/
│   ├── config.schema.json        # JSON Schema for the node config (optional but recommended)
│   └── state.schema.json         # JSON Schema for persisted state (optional but recommended)
└── icon.svg / docs/guide.md / assets/   # advisory, not validated
```

Manifest (`widget.manifest.json`) fields are defined by `WidgetManifestSchema` in `packages/schemas/src/community-widget-manifest.ts`. The critical ones:

| Field                        | Notes                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `id`                         | Namespaced `publisher.widget-name`, e.g. `community.example.counter`                |
| `version`                    | Exact semver; artifacts are immutable, so any content change requires a new version |
| `apiVersion`                 | Must be exactly `open-edu.widget/1`                                                 |
| `artifact.format`            | `'multi-file'` or `'self-contained-html'`                                           |
| `artifact.documentUrl`       | HTTPS, public, non-loopback document URL                                            |
| `artifact.documentIntegrity` | `sha256-` + 64 lowercase **hex** chars of the exact served document bytes           |
| `artifact.sizeBytes`         | Exact byte length of the served document                                            |
| `capabilities`               | The subset of the v1 capability list you request (see §6)                           |
| `distribution.offline`       | `true` **requires** `artifact.format: 'self-contained-html'`                        |
| `status`                     | Intent only; the resolver demotes unsigned `verified` to `experimental`             |

Note the two different hash spellings: `documentIntegrity` is `sha256-<64 hex>`; the CSP `script-src` hash is `sha256-<base64>`. Do not mix them up.

## 3. The `open-edu.widget/1` protocol

Every message uses the same envelope (schemas in `packages/schemas/src/widget-protocol.ts`):

```ts
{
  apiVersion: 'open-edu.widget/1',
  type: string,        // message type, see tables below
  instanceId: string,  // per-render instance id, received in init
  nonce: string,       // random per-render nonce, received in init
  sequence: number,    // starts at 1; increments by exactly 1 per message
  requestId?: string,  // for request/response correlation (state:save)
  payload: unknown,
}
```

The host rejects envelopes with the wrong `apiVersion`, `instanceId`, `nonce`, or out-of-order `sequence` (each must equal the previous + 1), from untrusted origins, or with malformed payloads — `validateHostBoundMessage` / `validateWidgetBoundMessage` in `packages/widget-sdk/src/validate-message.ts`.

**Host → widget** messages: `init`, `state:update`, `locale:update`, `theme:update`, `lifecycle:pause`, `lifecycle:destroy`, `capability:result`.

**Widget → host** messages:

| Message       | Payload                                                              | Purpose                                                                                                                   |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `ready`       | `{}`                                                                 | Must be sent after `init`; the host won't act on other messages (except `init`) until `ready`                             |
| `interaction` | `{ action, data? }` where `action` is from `InteractionActionSchema` | Report a learner action (`select`, `submit`, `retry`, `hint-request`, `reveal`, `drag`, `drop`, `navigate`, `custom`)     |
| `state:save`  | `{ requestId, schemaVersion, state }`                                | Request state persistence; host replies with `state:update` `{ requestId, accepted, normalizedState?, rejectionReason? }` |
| `complete`    | `{ score?, state?, reason? }`                                        | Request node completion; the host validates score/state and writes the persisted answer itself                            |
| `resize`      | `{ height }`                                                         | Request iframe height; the host debounces and clamps to safe bounds                                                       |
| `error`       | `{ message }`                                                        | Report a widget error                                                                                                     |

**`capability:request` is dropped by the host in v1.** No v1 capability uses the request/response channel, so the host deterministically rejects that message type (`validateHostBoundMessage`) to keep the extension point safe. Do not depend on it.

The host enforces limits: a 10 second ready timeout, ≤ 120 host-bound messages per minute, ≤ 64 KiB serialized state, and clamped iframe heights — see `packages/runtime/src/widgets/sandbox-limits.ts`. Messages arriving before `ready` are dropped and recorded as diagnostics; `state:save` is never accepted pre-`ready`.

### Using `createWidgetHostClient`

Prefer the SDK helper over hand-rolling the envelope:

```ts
import { createWidgetHostClient } from '@open-edu/widget-sdk';

const client = createWidgetHostClient({ target: window.parent, instanceId, nonce });

client.onInit((payload) => {
  // payload.config, payload.storedState, payload.locale, payload.theme,
  // payload.capabilities, payload.themeTokens, payload.prefersReducedMotion
  client.ready();
});

client.interaction('select', { index: 1 });
client.saveState({ requestId: 'r1', schemaVersion: '1', state: { count: 3 } });
client.complete({ score: 100, reason: 'submitted', state: { count: 3 } });
client.resize(240);
```

Inside the client, `sequence` starts at 0 and increments before each `post`, so the first message carries `sequence: 1`. The host requires each inbound sequence to be exactly one more than the previous (`validateHostBoundMessage`). `@open-edu/widget-sdk` is React-free; the example counter re-implements the same envelope by hand to prove the protocol has no framework dependency.

## 4. CSP requirement

The widget document ships its own `Content-Security-Policy` meta element:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'sha256-<hash>'; style-src 'unsafe-inline'; base-uri 'none'; object-src 'none'; connect-src 'none'; frame-src 'none';"
/>
```

Mandatory directives:

- `default-src 'none'`
- `script-src 'sha256-...'` for self-contained documents (allows exactly your inline bundle, nothing else). Multi-file online documents use `script-src 'self'` instead — see the `MULTI_FILE_CSP` fixture in `packages/widget-sdk/src/fixtures/protocol-fixtures.ts`.
- `connect-src 'none'` — **required**
- `frame-src 'none'` — **required**

`style-src 'unsafe-inline'` is required only if you have inline `<style>` blocks, which is typical for a self-contained widget.

The install validator (`verifyDocumentCsp` in `packages/widgets/src/install/verify-suite.ts`) rejects any document whose CSP meta is missing `connect-src 'none'` or `frame-src 'none'`. The registry also mirrors the policy as a response header when it serves online documents (see `apps/dev-server/src/widget-registry/routes.ts`).

**Compute the `script-src` hash with the SDK helper** — never by hand:

```ts
import { computeSelfContainedCspHash } from '@open-edu/widget-sdk/build-helpers';

const inlineScript = '<your exact inline bundle>'; // text between <script> and </script>
const hash = computeSelfContainedCspHash(inlineScript); // "sha256-<base64>"
```

It returns the canonical `sha256-<base64>` digest over the exact UTF-8 bytes of the inline script content. Since the CSP hash and the document integrity (`documentIntegrity`, `sha256-<64 hex>` over the whole file) are computed over different bytes, your build must compute both from the final artifact so a CSP/integrity mismatch can't slip through.

## 5. Self-contained offline build

To ship a widget that works offline:

- Set `distribution.offline: true` — this **requires** `artifact.format: 'self-contained-html'` (enforced by `WidgetManifestSchema`). Multi-file widgets are online-only in v1.
- Inline **everything** into `dist/index.html`: the entire script in one inline `<script>` tag, CSS in `<style>`, assets as `data:` URIs.
- Embed the CSP meta with the computed `script-src 'sha256-...'` hash so the policy also applies when the host executes the document from a verified `srcdoc`/Blob (a relative path or external script would be blocked anyway).
- Set `artifact.documentIntegrity` to the sha256 hex of **the exact served bytes** (i.e., hash the file you actually publish), and `artifact.sizeBytes` to its exact byte length.
- Do not use relative `src="./..."` / `href="./..."` subresources — `isSelfContainedHtml` (`packages/widgets/src/install/verify-suite.ts`) rejects them at install time.

The install validator checks `documentIntegrity` against the uploaded bytes, that `sizeBytes` equals the exact byte length and is ≤ the deployment's `maxArtifactBytes` (default 2 MiB), and that the document is truly self-contained.

## 6. Capabilities

The v1 capability list (`WidgetCapabilitySchema` in `packages/schemas/src/community-widget-manifest.ts`):

| Capability              | What it gates                                    |
| ----------------------- | ------------------------------------------------ |
| `resize`                | `resize` messages                                |
| `telemetry-interaction` | `interaction` messages                           |
| `state-persistence`     | `state:save` messages                            |
| `locale`                | `locale:update` delivery                         |
| `theme`                 | `theme:update` delivery                          |
| `hints`                 | `hint-request` interactions                      |
| `observe-mode`          | Read-only presentation/narration; see note below |

**Requesting a capability is opt-in — if you don't declare it, you won't get it.** At resolve time the host computes `grantedCapabilities = manifest.capabilities ∩ policy.grantedCapabilities` (`packages/widgets/src/resolver/widget-resolver.ts`) and delivers that intersection in `init.capabilities`. A deployment can also grant a subset via policy, so the capabilities you receive in `init` are authoritative — gate your behavior on them.

**`observe-mode` pausing.** A widget granted `observe-mode` without `telemetry-interaction` must not request completion: the adapter rejects `complete` for observe-mode-only widgets (`SandboxWidgetAdapter.tsx`), because an observer cannot submit answers. It may reveal content and report what it shows, nothing more.

## 7. React is not required

The SDK (`@open-edu/widget-sdk`) is framework-agnostic and has no React dependency. Your widget owns its DOM completely and can be vanilla JS, React mounted locally, or anything else — the host only cares about the wire protocol.

State, however, lives with the **host**. The host stores learner state and delivers it on mount as `init.storedState`; you persist via `state:save` (host replies `state:update` with the normalized state). On remount you rehydrate from `storedState` — never invent your own persistence.

## 8. Never call host APIs

Your document is sandboxed; do not reach outside the protocol:

- **Do not** touch `window.parent` internals, other frames, or the host DOM.
- **Do not** touch host `localStorage` or any host storage — your iframe gets an opaque/no-same-origin context, and your reads/writes would not be the host's.
- **Do not** navigate `window.top` — the sandbox forbids top-level navigation, and an attempt is a vulnerability smell.
- **Do not** `fetch`/XHR at runtime — the CSP `connect-src 'none'` blocks it anyway, and install validation rejects recipes that rely on it.

If you find you need any of these, you are doing something outside the v1 model. Redesign, or get a capability/protocol extension upstream.

## 9. Getting published

Publishing is an **administrative install into the instance registry** — you do not ship code inside a `.oep` course. See the [Widget Registry Operator Runbook](./widget-registry-operator-runbook.md) for the operator flow, origin allowlist, revocation, and how courses pin your exact version + manifest integrity.
