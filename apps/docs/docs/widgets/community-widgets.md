---
sidebar_position: 2
---

# Community Widgets Developer Guide

This guide covers everything you need to build, publish, install, and troubleshoot community widgets for the Open-Edu Framework. Community widgets run in sandboxed iframes, communicate with the host via a versioned protocol, and never execute in the learner app's JavaScript realm.

## Overview

Open-Edu supports three trust tiers for widget execution:

| Tier               | Execution Environment                           | Use Case                                              |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| **native**         | Host React realm                                | Built-in widgets, trusted host packages               |
| **trusted-remote** | Host JavaScript realm                           | Controlled internal deployments (disabled by default) |
| **sandboxed**      | Cross-origin iframe (`sandbox="allow-scripts"`) | Community and instance-hosted widgets                 |

Community widgets use the **sandboxed** tier. The host runtime owns state, completion, telemetry, rewards, capabilities, and lifecycle. The widget requests actions; the host authorizes and records them.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Host Runtime (Learner App)                 │
│                                             │
│  WidgetRenderer → WidgetResolver            │
│       │                    │                │
│       │         ┌──────────┴──────────┐     │
│       │         │  NativeWidgetAdapter│     │
│       │         │   (React render)    │     │
│       │         └─────────────────────┘     │
│       │         ┌─────────────────────┐     │
│       └────────►│ SandboxWidgetAdapter│     │
│                 │  (iframe + broker)  │     │
│                 └──────────┬──────────┘     │
│                            │ postMessage    │
└────────────────────────────┼────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │  Community Widget     │
                 │  (iframe, vanilla JS) │
                 └───────────────────────┘
```

### Key Invariant

> Community widgets may request learning actions, but only the Open-Edu host may authorize and record them.

### Widget Resolver Flow

The `WidgetResolver` handles widget loading through these steps:

1. **Normalize** the reference (legacy `remoteWidget` → `WidgetReference`)
2. **Resolve** aliases and exact versions
3. **Select** source and trust tier under policy
4. **Fetch** and validate the manifest
5. **Verify** course-pinned manifest integrity
6. **Check** runtime and protocol compatibility
7. **Verify** `artifact.documentIntegrity` over the iframe document bytes
8. **Validate** `node.config` against `config.schema.json`
9. **Select** native or sandbox adapter
10. **Return** load state and a host-renderable widget handle

### Package Layout

A community widget package follows this structure:

```
widget-package/
├── widget.manifest.json        # Required: manifest describing the widget
├── dist/
│   ├── index.html              # Required: iframe document
│   ├── widget.js               # Widget JavaScript
│   └── widget.css              # Widget styles
├── schema/
│   ├── config.schema.json      # Optional: JSON Schema for config validation
│   └── state.schema.json       # Optional: JSON Schema for state validation
├── icon.svg                    # Optional: widget icon
├── docs/guide.md               # Optional: documentation
└── assets/                     # Optional: static assets
```

## Building a Community Widget

### Step 1: Create the Manifest

Create `widget.manifest.json`:

```json
{
  "id": "community.example.counter",
  "version": "1.0.0",
  "apiVersion": "open-edu.widget/1",
  "artifact": {
    "documentUrl": "https://widgets.example.edu/counter/1.0.0/index.html",
    "documentIntegrity": "sha256-<64-hex-chars>",
    "sizeBytes": 4096,
    "format": "multi-file"
  },
  "publisher": {
    "id": "community.example",
    "name": "Example Publisher",
    "website": "https://example.com"
  },
  "metadata": {},
  "schemas": {
    "configUrl": "https://widgets.example.edu/counter/1.0.0/schema/config.schema.json"
  },
  "capabilities": ["resize", "telemetry-interaction", "state-persistence"],
  "accessibility": {},
  "supportedThemes": ["light", "dark", "zen"],
  "reducedMotion": "supported",
  "compatibility": {
    "runtime": ">=1.0.0"
  },
  "distribution": {
    "offline": false,
    "cachePolicy": "immutable"
  },
  "status": "experimental",
  "fallback": "core.multiple-choice"
}
```

#### Manifest Validation Rules

| Field                        | Rules                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `id`                         | Namespace dot name (e.g., `community.example.counter`)   |
| `version`                    | Exact semver                                             |
| `apiVersion`                 | Must be `open-edu.widget/1`                              |
| `artifact.documentUrl`       | HTTPS, non-loopback, non-private                         |
| `artifact.documentIntegrity` | `sha256-` + 64 lowercase hex chars                       |
| `artifact.format`            | `multi-file` or `self-contained-html`                    |
| `artifact.sizeBytes`         | Bounded by host policy (default 2 MiB)                   |
| `distribution.offline`       | `true` requires `artifact.format: "self-contained-html"` |
| `fallback`                   | Must resolve to an allowed native widget                 |

### Step 2: Create the Widget Document

Create `dist/index.html` — a vanilla JavaScript document that communicates with the host via `postMessage`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none';"
    />
    <style>
      body {
        font-family: system-ui, sans-serif;
        padding: 1rem;
        margin: 0;
      }
      button {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      // Widget SDK host client (framework-agnostic)
      const PROTOCOL_VERSION = 'open-edu.widget/1';
      let session = { instanceId: '', nonce: '', sequence: 0 };
      let initPayload = null;

      function post(type, payload, requestId) {
        session.sequence++;
        parent.postMessage(
          {
            apiVersion: PROTOCOL_VERSION,
            type,
            instanceId: session.instanceId,
            nonce: session.nonce,
            sequence: session.sequence,
            requestId,
            payload,
          },
          '*',
        );
      }

      // Listen for host messages
      window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || msg.apiVersion !== PROTOCOL_VERSION) return;

        if (msg.type === 'init') {
          session.instanceId = msg.payload.instanceId;
          session.nonce = msg.payload.nonce;
          initPayload = msg.payload;
          renderWidget(msg.payload.config);
          post('ready', {});
        }
      });

      function renderWidget(config) {
        const root = document.getElementById('root');
        let count = 0;

        root.innerHTML = `
        <h2>Counter: <span id="count">0</span></h2>
        <button id="increment">+1</button>
        <button id="done">Complete</button>
      `;

        document.getElementById('increment').addEventListener('click', () => {
          count++;
          document.getElementById('count').textContent = count;
          post('interaction', { action: 'select', data: { index: count } });
        });

        document.getElementById('done').addEventListener('click', () => {
          post('complete', {
            score: Math.min(100, count * 10),
            reason: 'submitted',
          });
        });
      }
    </script>
  </body>
</html>
```

### Step 3: Create the Config Schema (Optional)

Create `schema/config.schema.json` for Studio validation:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "prompt": {
      "type": "string",
      "description": "The question or prompt to display"
    }
  },
  "required": ["prompt"]
}
```

### Step 4: Compute Integrity

Use `computeSelfContainedCspHash` from `@open-edu/widget-sdk/build-helpers` for self-contained widgets:

```typescript
import { computeSelfContainedCspHash } from '@open-edu/widget-sdk/build-helpers';

const inlineScript = 'console.log(1)';
const cspHash = computeSelfContainedCspHash(inlineScript);
// Returns: "sha256-<base64>"
```

For multi-file widgets, compute the SHA-256 of the served document bytes:

```typescript
import { canonicalIntegrity } from '@open-edu/widgets';

const documentBytes = new TextEncoder().encode(documentHtml);
const integrity = await canonicalIntegrity(documentBytes);
// Returns: "sha256-<64-lowercase-hex>"
```

### Step 5: Test Locally

Use the local development registry:

```typescript
import { createDevRegistry } from '@open-edu/widget-sdk/dev';

const registry = createDevRegistry({
  relaxedOrigins: ['http://localhost:4177'],
});
```

The dev registry allows HTTP localhost origins (development only). Production `WidgetPolicy.allowedOrigins` still rejects these.

## Protocol Reference

### Message Envelope

All messages between host and widget use this envelope:

```typescript
interface WidgetMessage<TType extends string, TPayload> {
  apiVersion: 'open-edu.widget/1';
  type: TType;
  instanceId: string;
  nonce: string;
  sequence: number;
  requestId?: string;
  payload: TPayload;
}
```

### Host → Widget Messages

| Message             | Purpose                                         | Key Payload Fields                                                        |
| ------------------- | ----------------------------------------------- | ------------------------------------------------------------------------- |
| `init`              | Send config, state, locale, theme, capabilities | `config`, `storedState`, `locale`, `theme`, `themeTokens`, `capabilities` |
| `state:update`      | Acknowledge or replace persisted state          | `accepted`, `normalizedState`, `rejectionReason`                          |
| `locale:update`     | Change locale                                   | `locale`                                                                  |
| `theme:update`      | Change theme                                    | `theme`, `themeTokens`                                                    |
| `lifecycle:pause`   | Pause interaction                               | —                                                                         |
| `lifecycle:destroy` | Release resources                               | —                                                                         |
| `capability:result` | Return capability result                        | —                                                                         |

### Widget → Host Messages

| Message              | Purpose                     | Key Payload Fields                    |
| -------------------- | --------------------------- | ------------------------------------- |
| `ready`              | Mark mount successful       | —                                     |
| `resize`             | Request height              | `height`                              |
| `interaction`        | Report learner action       | `action`, `data`                      |
| `complete`           | Request completion          | `score`, `state`, `reason`            |
| `state:save`         | Request state persistence   | `requestId`, `schemaVersion`, `state` |
| `capability:request` | Request declared capability | —                                     |
| `error`              | Report widget error         | `message`                             |

### Interaction Actions

Protocol v1 uses a controlled action vocabulary:

| Action         | Description                                       |
| -------------- | ------------------------------------------------- |
| `select`       | Learner selected an option                        |
| `submit`       | Learner submitted an answer                       |
| `retry`        | Learner retried                                   |
| `hint-request` | Learner requested a hint                          |
| `reveal`       | Content revealed                                  |
| `drag`         | Drag started                                      |
| `drop`         | Drop completed                                    |
| `navigate`     | Navigation within widget                          |
| `custom`       | Custom action (requires manifest-declared schema) |

### Capabilities

Capabilities control which messages the widget may send:

| Capability              | Gated Messages                                      |
| ----------------------- | --------------------------------------------------- |
| `resize`                | `resize`                                            |
| `telemetry-interaction` | `interaction`                                       |
| `state-persistence`     | `state:save`                                        |
| `locale`                | `locale:update`                                     |
| `theme`                 | `theme:update`                                      |
| `hints`                 | `interaction` with action `hint-request`            |
| `observe-mode`          | Read-only presentation mode; no `complete` accepted |

Capabilities are declared in the manifest and granted by deployment policy. A widget cannot self-grant capabilities.

### Init Context

The widget receives only this initialization data:

```typescript
interface WidgetInitContext {
  apiVersion: 'open-edu.widget/1';
  widgetId: string;
  widgetVersion: string;
  instanceId: string;
  nodeId: string;
  config: Record<string, unknown>;
  storedState?: unknown;
  locale: string;
  theme: 'light' | 'dark' | 'zen';
  themeTokens: Record<string, string>;
  prefersReducedMotion: boolean;
  capabilities: WidgetCapability[];
}
```

The widget must **not** receive the complete course package, learner profile, arbitrary runtime context, storage handles, or sensitive learner data.

## Using the Widget SDK

Install `@open-edu/widget-sdk` in your widget project:

```bash
npm install @open-edu/widget-sdk
```

### Creating a Host Client

```typescript
import { createWidgetHostClient } from '@open-edu/widget-sdk';

const client = createWidgetHostClient({
  target: { parent: window.parent, parentOrigin: '*' },
  instanceId: '...',
  nonce: '...',
});

// Signal ready
client.ready();

// Report interaction
client.interaction('select', { optionId: 'a' });

// Request completion
client.complete({ score: 100, reason: 'submitted' });

// Save state
client.saveState({
  requestId: '...',
  schemaVersion: '1',
  state: { progress: 0.5 },
});

// Request resize
client.resize(400);

// Report error
client.error('Something went wrong');

// Listen for init
client.onInit((payload) => {
  console.log('Config:', payload.config);
  console.log('Locale:', payload.locale);
  console.log('Theme:', payload.theme);
});
```

### Applying Theme Tokens

```typescript
import { applyThemeTokens } from '@open-edu/widget-sdk';

// Apply tokens as CSS custom properties
applyThemeTokens(document.documentElement, themeTokens);
// Sets: --oe-widget-color, --oe-widget-bg, etc.
```

## Publishing to an Instance Registry

### Install a Widget Package

Administrators install widgets through the instance registry API:

```bash
POST /widget-registry/install
Content-Type: application/json

{
  "manifest": { ... },
  "documentBytes": "<base64>",
  "archiveBytes": "<base64>"  // optional
}
```

The registry:

1. Validates the manifest against `WidgetManifestSchema`
2. Verifies `documentIntegrity` matches the document bytes
3. Checks `sizeBytes` against policy limits
4. Validates CSP headers in the document
5. Stores immutable versioned artifacts
6. Publishes to `catalog.json`

### Instance Registry Endpoints

| Endpoint                                                     | Method | Description                                    |
| ------------------------------------------------------------ | ------ | ---------------------------------------------- |
| `/widget-registry/catalog.json`                              | GET    | Widget catalog (`Cache-Control: max-age=3600`) |
| `/widget-registry/:publisher/:widget/:version/manifest.json` | GET    | Widget manifest                                |
| `/widget-registry/:publisher/:widget/:version/index.html`    | GET    | Widget document (with CSP header)              |
| `/widget-registry/install`                                   | POST   | Install a widget (admin)                       |
| `/widget-registry/:id/:version/revoke`                       | POST   | Revoke a widget                                |

### Filesystem Layout

```
.openedu-widget-registry/
├── catalog.json
├── community.example/
│   └── counter/
│       └── 1.0.0/
│           ├── manifest.json
│           ├── index.html
│           └── artifact.zip
```

## Referencing Widgets in Courses

### New Format (WidgetReference)

Use `widgetRef` on exercise/custom nodes:

```json
{
  "type": "exercise",
  "title": "Community Counter",
  "widgetRef": {
    "id": "community.example.counter",
    "version": "1.0.0",
    "source": "registry",
    "registryId": "main",
    "integrity": "sha256-<64-hex>",
    "fallback": "core.multiple-choice"
  },
  "config": {
    "prompt": "Count to 10!"
  }
}
```

### Legacy Format (remoteWidget)

Legacy `remoteWidget` fields are normalized to `source: 'url'`:

```json
{
  "type": "custom",
  "remoteWidget": {
    "id": "my-remote-widget",
    "version": "1.0.0",
    "url": "https://cdn.example.com/widget.js",
    "integrity": "sha256-<64-hex>",
    "fallback": "core.multiple-choice"
  }
}
```

:::warning
Legacy `remoteWidget` without integrity requires `trusted-remote` to be explicitly enabled in deployment policy. New content should always use `widgetRef` with `source: 'registry'` and mandatory integrity.
:::

## Deployment Policy

Configure widget behavior through `WidgetPolicy`:

```typescript
import { WidgetPolicySchema, DEFAULT_WIDGET_POLICY } from '@open-edu/schemas';

const policy = WidgetPolicySchema.parse({
  enabledTrustTiers: ['native', 'sandboxed'],
  allowedOrigins: ['https://widgets.example.edu'],
  registryCatalogOrigins: ['https://widgets.example.edu'],
  requireIntegrityForTrustedRemote: true,
  maxArtifactBytes: 2 * 1024 * 1024, // 2 MiB
  readyTimeoutMs: 10_000, // 10 seconds
  experimentalWidgets: 'deny',
  maxHostBoundMessagesPerMinute: 120,
  grantedCapabilities: [
    'resize',
    'telemetry-interaction',
    'state-persistence',
    'locale',
    'theme',
    'hints',
    'observe-mode',
  ],
});
```

### Policy Fields

| Field                              | Default                   | Description                                         |
| ---------------------------------- | ------------------------- | --------------------------------------------------- |
| `enabledTrustTiers`                | `['native', 'sandboxed']` | Which trust tiers are allowed                       |
| `allowedOrigins`                   | `[]`                      | HTTPS origins for trusted-remote widget URLs        |
| `registryCatalogOrigins`           | `[]`                      | Origins from which the resolver may fetch manifests |
| `requireIntegrityForTrustedRemote` | `true`                    | Mandate integrity for trusted-remote                |
| `maxArtifactBytes`                 | `2097152`                 | Maximum widget document size                        |
| `readyTimeoutMs`                   | `10000`                   | Timeout before widget is declared failed            |
| `experimentalWidgets`              | `'deny'`                  | Whether to allow experimental widgets               |
| `maxHostBoundMessagesPerMinute`    | `120`                     | Rate limit for widget→host messages                 |
| `grantedCapabilities`              | All v1 caps               | Capabilities granted to widgets                     |

## Offline Support

### Self-Contained HTML

Offline-capable widgets use `artifact.format: "self-contained-html"` with all JavaScript, CSS, and assets inlined:

```json
{
  "artifact": {
    "documentUrl": "https://widgets.example.edu/counter/1.0.0/offline.html",
    "documentIntegrity": "sha256-<64-hex>",
    "sizeBytes": 8192,
    "format": "self-contained-html"
  },
  "distribution": {
    "offline": true,
    "cachePolicy": "immutable"
  }
}
```

### CSP for Self-Contained Widgets

Self-contained widgets use a build-generated hash for inline scripts:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'sha256-<base64>'; style-src 'self' 'unsafe-inline'; ..."
/>
```

Compute the hash:

```typescript
import { computeSelfContainedCspHash } from '@open-edu/widget-sdk/build-helpers';

const hash = computeSelfContainedCspHash(inlineScriptContent);
// Returns: "sha256-<base64>"
```

### Artifact Cache

Verified artifacts are cached in memory (current session) and IndexedDB (offline):

- **Cache key:** `{widgetId, version, integrity}`
- **Verification:** `canonicalIntegrity(bytes)` recomputed on every read
- **Max entries:** 32 in memory, 50 MiB in IndexedDB
- **Eviction:** LRU by `cachedAt`

### Revocation Grace Period

When a widget is revoked:

- **Online:** Hard-blocked immediately
- **Offline:** Previously cached artifact allowed for **7 days** after revocation
- After grace period or first successful network check: hard-blocked

## State Management

### State Persistence Lifecycle

1. Widget sends `state:save` with `schemaVersion` and `state`
2. Host validates size and schema
3. Host responds with `state:update` (accepted or rejected)
4. Host stores state with widget version

### State Migration

When a widget version changes:

1. Host sends `init` with previously persisted `storedState`
2. Widget detects `schemaVersion` mismatch and migrates internally
3. Widget posts `state:save` with new `schemaVersion`
4. Host validates and accepts; clears `stateIncompatible` flag
5. If widget never posts migration save, `stateIncompatible` persists for render lifetime

### State Limits

- **Max state size:** 64 KiB (`MAX_STATE_BYTES`)
- **Schema validation:** Rejected with `rejectionReason: 'schema-invalid'` or `'too-large'`

## Fallback Widgets

When a community widget fails to load, the runtime can render a native fallback:

```json
{
  "widgetRef": {
    "id": "community.example.quiz",
    "version": "1.0.0",
    "source": "registry",
    "integrity": "sha256-...",
    "fallback": "core.multiple-choice"
  }
}
```

### Fallback Requirements

1. The failing widget's config must pass its declared input schema
2. The fallback adapter must transform the config successfully
3. The transformed config must pass the fallback widget's schema
4. If any step fails, the runtime shows an unavailable-widget error

### Fallback Provenance

Every saved answer records provenance:

```typescript
interface WidgetAnswerProvenance {
  intendedWidgetId: string; // community.example.quiz
  intendedWidgetVersion: string; // 1.0.0
  renderedWidgetId: string; // core.multiple-choice
  renderedWidgetVersion?: string;
  renderedViaFallback: boolean; // true
}
```

Completion and reward events include `renderedViaFallback` so reward policies can distinguish intended-widget completion from fallback-completed work.

## Security Model

### Sandbox Attributes

```html
<iframe
  sandbox="allow-scripts"
  referrerpolicy="no-referrer"
  loading="lazy"
  title="Interactive widget: community.example.counter"
/>
```

**Protocol v1 restrictions:**

- No `allow-same-origin`
- No top-level navigation
- No arbitrary popups
- No host DOM access
- No host storage access
- No host asset broker

### Content Security Policy

Multi-file online widgets ship baseline CSP:

```
default-src 'none';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
media-src 'self' data:;
font-src 'self' data:;
connect-src 'none';
frame-src 'none';
object-src 'none';
base-uri 'none';
```

### Learner App CSP

The learner app must include configured widget origins in `frame-src`:

```typescript
import { frameSrcCsp } from './widget-policy';

const csp = frameSrcCsp(['https://widgets.example.edu']);
// Returns: "frame-src 'self' https://widgets.example.edu"
```

### Integrity Verification

Two levels of integrity:

1. **Manifest integrity:** SHA-256 of manifest bytes, pinned in the course package
2. **Document integrity:** SHA-256 of served iframe document bytes, declared in manifest

Both must match before the widget executes.

## Testing

### Unit Tests

Run widget-related tests:

```bash
# Schemas
pnpm --filter @open-edu/schemas test

# Widget SDK (framework-agnostic)
pnpm --filter @open-edu/widget-sdk test

# Native widgets + resolver + cache
pnpm --filter @open-edu/widgets test

# Runtime adapters + renderer
pnpm --filter @open-edu/runtime test

# Studio catalog + preview
pnpm --filter @open-edu/dev-server test
```

### E2E Tests

```bash
pnpm test:e2e tests/e2e/community-widget.spec.ts
```

E2E tests verify:

- Widget loads in sandboxed iframe
- State persists across reload
- Widget cannot access host localStorage
- Widget cannot navigate parent
- Offline self-contained widget loads from cache
- Revoked widget is blocked online
- CSP blocks undeclared network loads
- Idle unmount restores state

### Conformance Fixtures

The `@open-edu/widget-sdk` ships protocol conformance fixtures:

```typescript
import {
  VALID_INIT_MESSAGE,
  WRONG_NONCE_MESSAGE,
  EXPIRED_SEQUENCE_MESSAGE,
  MULTI_FILE_CSP,
  SELF_CONTAINED_CSP_PREFIX,
  CAPABILITY_REQUEST_V1_REJECTION_FIXTURE,
} from '@open-edu/widget-sdk/fixtures';
```

## Troubleshooting

### Common Issues

| Symptom                          | Cause                                        | Fix                                      |
| -------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Widget never becomes ready       | Ready timeout exceeded (10s)                 | Check network, reduce init complexity    |
| `integrity mismatch`             | Document bytes changed after publish         | Recompute `documentIntegrity`            |
| `trusted-remote disabled`        | Policy does not enable `trusted-remote`      | Use `source: 'registry'` instead         |
| `registry-origin-not-allowed`    | Fetch origin not in `registryCatalogOrigins` | Add origin to policy                     |
| `state-incompatible`             | Widget version changed without migration     | Implement state migration in widget      |
| `observe-mode-complete-rejected` | Widget sent `complete` in observe mode       | Remove `complete` call in observe mode   |
| `rate-limit`                     | >120 host-bound messages per minute          | Throttle interaction emissions           |
| Widget not in Studio catalog     | `status: 'revoked'` or missing from catalog  | Check manifest status and catalog config |

### Diagnostics

Safe diagnostics are recorded for every widget load:

- Widget ID/version
- Integrity status
- Protocol version
- Source/trust tier
- Load duration
- Cache hit/miss
- Fallback usage
- Message rejection category

Diagnostics are **never** routed through `widget_interaction` (that is a learner-action event). Use the `onDiagnostic` callback or `DiagnosticBus` for system-level signals.

### Debug Mode

In development, the resolver logs normalization warnings:

```typescript
if (process.env.NODE_ENV !== 'production') {
  warnings.forEach((w) => console.warn('[open-edu:widget-resolver]', w.code, w.message));
}
```

## API Reference

### `@open-edu/schemas`

| Export                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `WidgetManifestSchema`        | Zod schema for community widget manifests               |
| `WidgetReferenceSchema`       | Zod schema for widget references (builtin/registry/url) |
| `WidgetMessageEnvelopeSchema` | Zod schema for protocol message envelopes               |
| `WidgetPolicySchema`          | Zod schema for deployment policy                        |
| `WidgetCapabilitySchema`      | Enum of protocol v1 capabilities                        |
| `InteractionActionSchema`     | Enum of interaction actions                             |
| `PROTOCOL_API_VERSION`        | `'open-edu.widget/1'` constant                          |
| `DEFAULT_WIDGET_POLICY`       | Default policy (trusted-remote disabled)                |

### `@open-edu/widget-sdk`

| Export                       | Description                            |
| ---------------------------- | -------------------------------------- |
| `createWidgetHostClient()`   | Widget-side postMessage helper         |
| `applyThemeTokens()`         | Apply theme tokens as CSS variables    |
| `validateHostBoundMessage()` | Validate inbound message envelope      |
| `normalizeInteractionData()` | Per-action interaction data normalizer |
| `PROTOCOL_API_VERSION`       | Protocol version constant              |

### `@open-edu/widget-sdk/build-helpers`

| Export                          | Description                         |
| ------------------------------- | ----------------------------------- |
| `computeSelfContainedCspHash()` | SHA-256 CSP hash for inline scripts |

### `@open-edu/widget-sdk/dev`

| Export                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `createDevRegistry()` | Local development registry with relaxed origins |

### `@open-edu/widgets`

| Export                   | Description                           |
| ------------------------ | ------------------------------------- |
| `canonicalIntegrity()`   | Compute `sha256-<hex>` over bytes     |
| `verifyIntegrity()`      | Verify bytes match integrity string   |
| `parseIntegrity()`       | Parse and validate integrity format   |
| `createWidgetResolver()` | Create a policy-aware widget resolver |
| `WidgetArtifactCache`    | Memory + IndexedDB artifact cache     |
| `loadStaticCatalog()`    | Load and index a registry catalog     |
| `applyFallbackConfig()`  | Apply fallback config transform       |

## Local Development

The learner app can serve community widgets directly from a local directory — no dev-server or DevTools globals needed.

### Quick start

```bash
EDU_WIDGET_DIR=./examples/community-widget-counter \
  pnpm --filter @open-edu/learner dev
```

Then open `http://localhost:4001` and navigate to a course that references the widget (e.g., `community-widget-counter-course`).

### How it works

1. On startup, the learner's Vite dev server scans `EDU_WIDGET_DIR` for installed widgets using the `{publisher}/{widgetId}/{version}/manifest.json` layout.
2. It serves the catalog at `/widget-registry/catalog.json` and individual widget files at `/widget-registry/{publisher}/{widgetId}/{version}/manifest.json` and `index.html`.
3. In dev mode, `CourseRuntime` auto-discovers the catalog from the same origin — no `__OPEN_EDU_WIDGET_CATALOG_URL__` or `__OPEN_EDU_WIDGET_ORIGINS__` globals needed.
4. Experimental widgets are automatically allowed for locally-served catalogs.

### Widget directory structure

```
$EDU_WIDGET_DIR/
  localpub/
    community.example.counter/
      1.0.0/
        manifest.json
        index.html
```

The directory layout matches the `WidgetRegistryStore` on-disk format. Multiple publishers, widgets, and versions are supported.

### Integrity verification

The learner verifies `documentIntegrity` and `sizeBytes` from each `manifest.json` against the actual `index.html` file at startup. Widgets with mismatched integrity are skipped with a console warning.

### Combining with courses

```bash
EDU_CATALOG_DIR=./examples EDU_WIDGET_DIR=./examples/community-widget-counter \
  pnpm --filter @open-edu/learner dev
```

This loads all example courses and makes the community counter widget available.

## Further Reading

- [Widgets Overview](./overview) — Built-in widgets, registry, and catalog
- [Widget Library](../widget-library/getting-started) — Building lessons with widgets
- [Runtime](../runtime) — Node renderers, layout components, and theming
- [Package Format](../package-format) — Package structure and node types
- [Testing Guide](../testing) — Unit and E2E testing
