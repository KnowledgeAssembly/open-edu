# OpenEdu Runtime Community Widget Ecosystem — Technical Design Spec

**Date:** 2026-08-14
**Status:** Draft for maintainer review
**Audience:** Open-Edu maintainers, widget SDK contributors, registry operators, and implementers
**Scope:** Runtime deployment of third-party/community widgets without rebuilding the learner application
**Published Guide:** [Community Widgets Developer Guide](../../../apps/docs/docs/widgets/community-widgets) — the canonical developer-facing reference for building, publishing, and installing community widgets

## 1. Summary

Open-Edu already has a typed widget registry, built-in React widgets, enriched metadata, a remote-widget manifest, runtime fallbacks, and persisted widget answers. The missing capability is a safe, governed way for community developers to publish widgets that a learner runtime can discover and load at runtime.

This design introduces two execution tiers and three deployment modes:

1. **Native widgets** remain the highest-performance path for built-ins and explicitly trusted host-installed packages.
2. **Community widgets** run in a sandboxed iframe and communicate with the host through a versioned, schema-validated protocol.

The same community artifact can be hosted by:

- a public registry or CDN;
- an Open-Edu instance’s self-hosted widget registry; or
- an offline course installation/cache.

The runtime, not the widget, owns learner state, completion, telemetry, rewards, asset resolution, capabilities, and lifecycle. A registry supplies immutable, versioned manifests and artifacts. A resolver selects the appropriate adapter, verifies integrity and compatibility, caches the artifact, and renders the widget through the existing WidgetRenderer lifecycle.

Existing course packages and the current WidgetDefinition API remain valid. Existing remoteWidget nodes are read through a compatibility adapter, but direct same-realm JavaScript execution is a trusted/developer-only mode and is not the public community model.

## 2. Problem and goals

### 2.1 Problem

The current remote loader fetches JavaScript, evaluates it through a Blob URL, and registers the resulting React renderer in the host registry. That code executes in the learner application’s JavaScript realm. A compromised or malicious widget could access host DOM, storage, runtime state, network capabilities, or other application APIs.

The current manifest has apiVersion, integrity, and permissions, but these are not sufficient controls:

- permissions are declarative and have no capability broker;
- apiVersion is not negotiated;
- remote metadata and configuration/state schemas are not loaded or validated;
- integrity is optional and uses a custom hexadecimal digest comparison;
- remote interactions are not consistently bridged into telemetry;
- a remote URL is embedded in a content node rather than resolved through a governed dependency layer.

### 2.2 Goals

- Allow community developers to publish widgets without changing the learner application.
- Keep third-party widget code isolated from the host application.
- Preserve built-in widgets and existing course packages.
- Provide a framework-agnostic community contract; React is not required.
- Make versions, integrity, publisher, compatibility, and status explicit.
- Keep learner state and telemetry authoritative in the host runtime.
- Support offline caching and deterministic version resolution.
- Support accessibility, themes, locale, assets, rewards, and authoring metadata.
- Give Studio and AI authoring the same catalog as the runtime.
- Provide a staged migration from the current remote-widget prototype.

### 2.3 Non-goals

- Building a marketplace, billing system, or social community.
- Executing arbitrary third-party code in the learner app’s JavaScript realm.
- Allowing widgets to manipulate the host DOM.
- Installing npm dependencies at runtime.
- Allowing widgets to bypass host validation by emitting raw telemetry or mutating progress.
- Solving server-side widget integrations in protocol version 1.

## 3. Existing architecture and reuse points

| Existing surface     | Reuse                                                       |
| -------------------- | ----------------------------------------------------------- |
| WidgetRenderProps    | Native adapter contract; concepts map to sandbox messages   |
| WidgetDefinition     | Native widget implementation contract                       |
| WidgetDefinitionV2   | Catalog, AI, accessibility, rewards, and authoring metadata |
| WidgetRegistry       | Host-side registry facade, extended with source and version |
| RemoteWidgetManifest | Compatibility input only                                    |
| WidgetRenderer       | Lifecycle, fallback, persistence, and error presentation    |
| WidgetAnswer         | Host-owned persisted state and score envelope               |
| widget_interaction   | Canonical normalized telemetry event                        |
| .oep archives        | Course distribution; widget dependencies remain resolvable  |
| PWA/Workbox          | Artifact and manifest caching after verification            |

Important current files:

- packages/widgets/src/types.ts
- packages/widgets/src/registry.ts
- packages/widgets/src/remote-loader.ts
- packages/runtime/src/renderers/WidgetRenderer.tsx
- packages/schemas/src/nodes.ts
- packages/schemas/src/widget-manifest.ts
- packages/schemas/src/progress.ts
- packages/schemas/src/telemetry.ts

## 4. Architecture decisions

### 4.1 Trust tiers

| Tier           | Execution                                   | Intended source                           | Production default         |
| -------------- | ------------------------------------------- | ----------------------------------------- | -------------------------- |
| native         | Host JavaScript realm                       | Built-ins and build-time trusted packages | Enabled                    |
| trusted-remote | Host JavaScript realm                       | Controlled internal deployments           | Disabled unless configured |
| sandboxed      | Cross-origin iframe with restricted sandbox | Community and instance-hosted widgets     | Enabled                    |

The host policy selects the trust tier. A course may request a source, but it cannot grant itself host privileges.

### 4.2 Registry and resolver

The registry publishes metadata and immutable artifacts. The runtime still verifies schema, compatibility, integrity, status, and policy. A registry may be public or instance-local. The runtime must support static catalogs so a learner runtime does not require a central request for every render.

An Open-Edu instance can configure one or more registry bases, including its own local registry. “Local” means the artifact is hosted and governed by that instance; it does not mean community code executes in the host JavaScript realm.

### 4.3 Host-owned pedagogical authority

The widget may request completion, score, state persistence, hints, and capabilities. The host validates and accepts or rejects each request. Multi-file widget subresources are resolved by the verified registry document and are not exposed through a host asset broker in protocol version 1.

- A widget cannot directly complete a workflow node.
- A widget cannot write progress directly.
- A widget cannot emit rewards directly.
- A widget cannot send arbitrary telemetry fields.
- A widget cannot resolve arbitrary URLs through a host asset broker or loader.

### 4.4 Exact versions

Authoring tools may select a version range, but the generated course package records an exact widget version and integrity value. A course must not silently change behavior because a publisher released a new version.

## 5. Manifest and content model

### 5.1 Package layout

```text
widget-package/
├── widget.manifest.json
├── dist/
│   ├── index.html
│   ├── widget.js
│   └── widget.css
├── schema/
│   ├── config.schema.json
│   └── state.schema.json
├── icon.svg
├── docs/guide.md
└── assets/
```

The package may be hosted on a public CDN, object storage, GitHub Release, a self-hosted Open-Edu instance, or a future registry service. The runtime never installs npm dependencies at runtime.

### 5.2 Self-hosted instance registry

An Open-Edu deployment may expose a local widget registry backed by its own filesystem, object storage, or database. The registry publishes immutable artifacts and a catalog through deployment-configured endpoints:

```text
/widget-registry/catalog.json
/widget-registry/{publisher}/{widget}/{version}/manifest.json
/widget-registry/{publisher}/{widget}/{version}/index.html
/widget-registry/{publisher}/{widget}/{version}/artifact.zip
```

The exact URL layout is an implementation detail; the manifest and catalog contracts are stable. The instance installation flow is:

```text
Administrator uploads widget package
  → validate manifest and artifact
  → verify integrity and policy
  → store immutable versioned artifact
  → publish instance catalog entry
  → course references exact widget version
  → learner resolves from configured local registry
  → sandboxed widget runs in iframe
```

Instance-hosted community widgets remain sandboxed. The instance should serve them from a dedicated widget origin or an isolated origin policy with no application cookies, and must not grant allow-same-origin in protocol version 1.

The registry extracts and validates uploaded packages before publishing the iframe document. The runtime loads the served index.html URL; it does not unzip packages or attempt to serve archive-relative subresources itself. The zip is retained for administrative download, revalidation, and backup.

Offline-capable widgets use a separate self-contained HTML artifact with JavaScript, CSS, and assets inlined. The runtime may load that verified document from a cache-backed srcdoc/Blob URL because it has no relative subresource dependencies. A normal multi-file document is online-only unless the deployment provides an equivalent isolated document-serving mechanism.

The two artifact formats have different trust properties: multi-file widgets are trusted at the configured registry origin after the document is verified; self-contained widgets are independently verifiable because the complete executable document is hashed. The manifest must declare which format applies.

### 5.3 Canonical manifest

The canonical WidgetManifestSchema lives in packages/schemas and is also exported as JSON Schema.

```ts
interface WidgetManifest {
  id: string; // publisher-or-domain.widget-name
  version: string; // exact semver
  apiVersion: string; // open-edu.widget/1
  artifact: {
    documentUrl: string; // HTTPS iframe document URL
    documentIntegrity: string; // sha256 digest of served document bytes
    archiveUrl?: string; // optional administrative/download URL
    archiveIntegrity?: string;
    sizeBytes: number;
    format: 'multi-file' | 'self-contained-html';
  };
  publisher: {
    id: string;
    name: string;
    website?: string;
  };
  metadata: WidgetMetadata;
  schemas: {
    configUrl?: string;
    stateUrl?: string;
  };
  capabilities: WidgetCapability[];
  accessibility: AccessibilityDeclaration;
  supportedThemes: Array<'light' | 'dark' | 'zen'>;
  reducedMotion: 'supported' | 'not-supported' | 'not-applicable';
  compatibility: {
    runtime: string;
    browsers?: string[];
  };
  distribution: {
    offline: boolean;
    cachePolicy: 'immutable';
  };
  status: 'experimental' | 'verified' | 'deprecated' | 'revoked';
  fallback?: string;
  signature?: PublisherSignature;
}
```

Validation rules:

- IDs use a namespace and name.
- version is valid semver.
- Namespace is domain-like and publisher-controlled, such as community.example or org.example.
- Document URLs use HTTPS and cannot target file:, data:, blob:, loopback, or private-network addresses.
- Document integrity is mandatory; archive integrity is mandatory when archiveUrl is present.
- Artifact size is bounded by host policy.
- apiVersion has a supported protocol adapter.
- Revoked widgets cannot load, including from cache, unless the bounded offline grace policy applies.
- A fallback resolves to an allowed native widget and declares configuration compatibility.
- verified is a registry-attributed status. Unsigned or unreviewed manifests are experimental regardless of publisher-provided status.
- distribution.offline: true requires artifact.format: self-contained-html.

### 5.4 Widget references

New content uses:

```ts
type WidgetReference =
  | {
      id: string;
      version: string;
      source: 'builtin';
      fallback?: string;
    }
  | {
      id: string;
      version: string;
      source: 'registry' | 'url';
      registryId?: string; // logical registry configured by the deployment
      integrity?: string; // sha256 digest of manifest bytes; required for new registry references
      fallback?: string;
    };
```

The existing remoteWidget field remains readable. Normalization converts it to a WidgetReference with source: url. Production policy may reject that source or permit it only as trusted-remote. A self-hosted instance is represented as source: registry with a deployment-configured logical registryId, not an instance URL embedded in the course. Studio must warn when exporting a course that depends on a registry not present in the target deployment. External course references cannot be compiled or exported without integrity; builtin references are the only exception. For new registry references, integrity covers the manifest bytes. The manifest’s artifact.documentIntegrity then covers the served iframe document bytes.

Legacy remoteWidget references without integrity are not silently upgraded to registry trust. They route through the legacy trusted-remote/url-source policy, emit a validation warning, and remain permitted only when the deployment explicitly enables trusted-remote. This is how existing packages continue to run unchanged while new registry references remain strict. The type leaves integrity optional only so legacy url-source normalization can be represented without fabrication; new registry references must always supply it.

## 6. Public SDK

Create @open-edu/widget-sdk. It must not require React and should expose:

- manifest and protocol types;
- message validators;
- lifecycle helpers;
- state serialization helpers;
- completion and interaction helpers;
- capability types;
- locale and theme types;
- iframe test harness;
- protocol conformance fixtures.

@open-edu/widgets remains the native widget package and may depend on the SDK for shared types.

The sandbox receives only:

```ts
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

It must not receive the complete course package, learner profile, arbitrary runtime context, storage handles, or sensitive learner data. Configuration and storedState are visible to widget code and must contain only data appropriate for the widget’s declared trust tier.

## 7. Sandboxed protocol

### 7.1 Transport

Community widgets render in an iframe served from an origin distinct from the learner app:

```html
<iframe sandbox="allow-scripts" referrerpolicy="no-referrer" loading="lazy"></iframe>
```

Protocol version 1 does not grant allow-same-origin, top-level navigation, arbitrary popups, or host DOM access. For offline srcdoc/Blob execution, the iframe has an opaque origin created by the host. That host-created opaque origin is permitted only when the document bytes passed integrity verification and the instance nonce matches. All network-loaded documents remain subject to the configured origin allowlist.

### 7.2 Message envelope

```ts
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

The manifest apiVersion, init context apiVersion, and message apiVersion must match exactly. The host rejects unsupported versions, wrong instance IDs, wrong nonces, invalid sequences, untrusted origins, malformed payloads, and rate-limit violations.

### 7.3 Messages

| Direction     | Message            | Purpose                                             |
| ------------- | ------------------ | --------------------------------------------------- |
| Host → widget | init               | Send config, state, locale, theme, and capabilities |
| Host → widget | state:update       | Acknowledge or replace persisted state              |
| Host → widget | locale:update      | Change locale                                       |
| Host → widget | theme:update       | Change theme                                        |
| Host → widget | lifecycle:pause    | Pause interaction                                   |
| Host → widget | lifecycle:destroy  | Release resources                                   |
| Host → widget | capability:result  | Return capability result                            |
| Widget → host | ready              | Mark mount successful                               |
| Widget → host | resize             | Request height                                      |
| Widget → host | interaction        | Report learner action                               |
| Widget → host | complete           | Request completion                                  |
| Widget → host | state:save         | Request state persistence                           |
| Widget → host | capability:request | Request declared capability                         |
| Widget → host | error              | Report widget error                                 |

Interaction messages use a controlled action vocabulary in protocol version 1: `select`, `submit`, `retry`, `hint-request`, `reveal`, `drag`, `drop`, `navigate`, and `custom`. The `custom` action requires a manifest-declared action schema and is normalized before entering telemetry.

### 7.4 Completion

```ts
interface CompletePayload {
  score?: number;
  state?: unknown;
  reason?: 'finished' | 'submitted' | 'continued';
}
```

The host validates score range, state size, state schema, and lifecycle state. It then writes the existing WidgetAnswer shape with resolved widget ID and exact version before completing the workflow node. Every saved answer also records intended widget identity, rendered widget identity, and whether a fallback was used. Completion and reward/workflow events include renderedViaFallback so reward policies can distinguish intended-widget completion from fallback-completed work.

Fallback provenance is never hidden. The persisted answer envelope includes:

```ts
interface WidgetAnswerProvenance {
  intendedWidgetId: string;
  intendedWidgetVersion: string;
  renderedWidgetId: string;
  renderedWidgetVersion?: string;
  renderedViaFallback: boolean;
}
```

Fallbacks declare a configuration adapter with an input schema, output schema, and deterministic transform. A fallback is eligible only when the failing widget configuration passes the declared input schema and the transformed configuration passes the fallback schema. Otherwise the runtime shows an unavailable-widget error instead of guessing.

### 7.5 State protocol

State persistence uses request/response semantics:

```ts
interface StateSavePayload {
  requestId: string;
  schemaVersion: string;
  state: unknown;
}

interface StateSaveResult {
  requestId: string;
  accepted: boolean;
  normalizedState?: unknown;
  rejectionReason?: 'schema-invalid' | 'too-large' | 'lifecycle-closed' | 'policy-denied';
}
```

state:update is sent only after an accepted save and contains the normalized host state. A widget version change never silently discards incompatible stored state: the host attempts the declared migration, otherwise marks the state incompatible and reports a recoverable error. Starting from a clean state requires an explicit widget request or author-approved policy.

The expected widget-side migration lifecycle is:

1. The host sends `init` with the previously persisted `storedState` (any schemaVersion).
2. The widget detects that `storedState.schemaVersion` differs from its current schema and performs the migration internally.
3. The widget posts a `state:save` message with the migrated state and the new `schemaVersion`.
4. The host validates size and schema, then responds with `state:update` containing the `normalizedState`.
5. Only after an accepted `state:save` does the host clear the `state-incompatible` resolver error and allow subsequent completion.

If the widget never posts a migrated save, the host retains the incompatible-state error for the lifetime of the render. The SDK `host-client` should expose a `migrateState(newState, schemaVersion)` helper that posts the `state:save` and awaits the `state:update` acknowledgement.

State schemas declare schemaVersion. Migration functions are versioned by the widget and run inside the widget; the host validates the migrated result before persistence.

## 8. Capability model

Initial capabilities are narrow and allowlisted:

```ts
type WidgetCapability =
  | 'resize'
  | 'telemetry-interaction'
  | 'state-persistence'
  | 'locale'
  | 'theme'
  | 'hints'
  | 'observe-mode';
```

Version 1 excludes arbitrary network requests, camera/microphone, geolocation, clipboard writes, notifications, top-level navigation, learner identity/profile access, and direct rewards.

The manifest declares requested capabilities; deployment policy grants a subset. The widget can never grant itself a capability.

Capability-to-message mapping is explicit in protocol version 1:

| Capability            | Gated messages                       |
| --------------------- | ------------------------------------ |
| resize                | resize                               |
| telemetry-interaction | interaction                          |
| state-persistence     | state:save                           |
| locale                | locale:update                        |
| theme                 | theme:update                         |
| hints                 | interaction with action hint-request |
| observe-mode          | init and lifecycle state             |

Only the host sends capability:result. All request/response pairs use requestId; sequence numbers provide ordering but do not correlate concurrent requests. Protocol version 1 has no package-assets capability: online multi-file widgets resolve their own registry-origin subresources, while offline-capable widgets must inline all resources. capability:request and capability:result are the protocol extension point for future broker-backed capabilities; no protocol version 1 capability uses them.

observe-mode is a read-only presentation/narration mode: the widget may reveal content and report observations, but it must not accept learner answer input or request completion. hints are authoring/config-supplied content; the host records hint-request interactions but does not generate or provide hint text.

In protocol version 1, the host must explicitly reject (drop and record as a safe diagnostic) any inbound `capability:request` message from the widget, since no v1 capability uses the request/response channel. Conformance fixtures must include a test asserting this rejection. This prevents widgets from accidentally depending on an unimplemented path and makes the "extension point" behavior deterministic.

## 9. Runtime components

### 9.1 WidgetResolver

Responsibilities:

1. Normalize legacy and new references.
2. Resolve aliases and exact versions.
3. Select source and trust tier under policy.
4. Fetch and validate the manifest.
5. Verify the course-pinned manifest integrity before trusting any manifest fields.
6. Check runtime and protocol compatibility.
7. Verify artifact.documentIntegrity over the exact iframe document bytes.
8. Validate node.config against config.schema.json before execution.
9. Select a native or sandbox adapter.
10. Return load state and a host-renderable widget handle.

It must not directly mutate progress.

### 9.2 WidgetArtifactCache

Cache artifacts by {widgetId, version, integrity}. A cache hit is valid only when stored bytes match the manifest integrity value. Use memory cache for the current session and IndexedDB for verified offline artifacts. Support quotas, LRU eviction, revocation invalidation, and developer cache clearing.

### 9.3 SandboxWidgetAdapter

Creates and destroys the iframe, generates instance IDs/nonces, validates origins and messages, sends lifecycle events, enforces size/rate/payload limits, and bridges state, completion, telemetry, locale, theme, and capabilities. The default ready timeout is 10 seconds. A network failure may be retried once with bounded backoff; protocol, integrity, policy, and schema failures are not retried. Destroy-before-ready resolves as cancelled and cannot later transition the node to ready or complete. Host-bound messages received before ready are dropped and recorded as a safe diagnostic; state:save is never accepted pre-ready.

### 9.4 NativeWidgetAdapter

Wraps the current WidgetDefinition renderer and maps WidgetRenderProps to the common host lifecycle. Native widgets retain direct design-system and animation integration.

### 9.5 WidgetPolicy

Deployment configuration controls allowed registries/origins, trusted origins for manifest fetches (`registryCatalogOrigins`), enabled trust tiers, artifact and state limits, experimental-widget policy, capability grants, offline grace behavior for unavailable or revoked artifacts, and the learner CSP frame-src allowlist. The policy must also include `registryCatalogOrigins: string[]` — the exhaustive list of HTTPS non-loopback origins from which the resolver may fetch `manifest.json`. The resolver must refuse to fetch a manifest from any origin not in this list before attempting the network request. This provides defence-in-depth even when manifest integrity verification would ultimately reject a tampered response.

The default offline revocation policy allows a previously verified cached artifact to run for seven days after revocation when the device is offline. On the first successful network check after revocation, or after the grace window expires, the widget is hard-blocked. Revocation is checked against both the fetched manifest and the cached manifest.

Each node uses at most one widget iframe. The adapter records load time, transfer size, ready time, and peak message rate. Widgets are eligible for idle unmount when their node is not active and must restore host-owned state when remounted.

Initial performance budgets are a 2 MiB compressed self-contained document, a 10-second ready timeout, no more than one active widget iframe per node, and no more than 120 host-bound messages per minute during normal interaction. Registry verification records budget violations and the catalog marks them for review.

## 10. Data flow and failure behavior

### 10.1 First load

```text
ContentNode
  → normalize reference
  → WidgetResolver
  → fetch manifest
  → verify course-pinned manifest integrity
  → validate manifest
  → check policy and compatibility
  → fetch document and verify documentIntegrity
  → cache artifact
  → create adapter
  → iframe init
  → widget ready
  → render active node
```

### 10.2 Interaction and completion

```text
widget interaction
  → validate message
  → normalize into host telemetry

state save
  → validate size/schema
  → persist host progress

complete
  → validate score/state
  → save WidgetAnswer
  → complete workflow node
  → allow rewards/workflow subscribers to react
```

### 10.3 Failure matrix

| Failure               | Behavior                                     |
| --------------------- | -------------------------------------------- |
| Registry unavailable  | Use verified cache, otherwise fallback/error |
| Invalid manifest      | Reject and show safe error                   |
| Integrity mismatch    | Never execute; mark failed                   |
| Protocol incompatible | Reject before initialization                 |
| Widget timeout        | Destroy iframe; fallback/error               |
| Malformed message     | Drop and record safe diagnostic              |
| Oversized state       | Reject save and notify widget                |
| Revoked widget        | Block new execution; apply offline policy    |
| Missing fallback      | Localized unavailable-widget state           |

## 11. Accessibility, theme, locale, and sizing

Sandboxing does not reduce accessibility requirements. Certified widgets must provide keyboard support where applicable, visible focus, semantic labels, screen-reader status/error handling, non-color-only meaning, reduced-motion behavior, and focus restoration when destroyed.

The host provides the accessible loading/error shell and iframe region name. The iframe has a required localized title/aria-label. The widget owns internal accessibility.

The host sends semantic theme and locale values plus resolved theme token values. The SDK applies those values as CSS custom properties on the iframe document root; widgets do not access host CSS variables or classes. The manifest declares supported themes and reduced-motion behavior. Widgets must support forced-colors/high-contrast modes or declare that they are not accessible for those modes. A resize request is debounced and clamped by the host to safe minimum/maximum bounds.

## 12. Catalog, Studio, and AI integration

The canonical catalog must represent native, public-registry, and instance-registry widgets with source, registry origin, trust tier, version, verification status, schemas, offline support, themes/locales, accessibility status, and fallback.

Studio must use the same catalog to:

1. discover widgets by domain and learning intent;
2. hide revoked widgets and label experimental/sandboxed widgets;
3. validate configuration using JSON Schema;
4. preview community widgets through the sandbox adapter;
5. write exact version and integrity values on export;
6. warn about online-only behavior.

AI authoring must generate only catalog IDs and must satisfy the selected widget schema.

The SDK must include a local development registry with hot reload, fixture manifests, and a development-only relaxed origin policy. The development path must still use the sandbox adapter so widgets are not accidentally tested only in the trusted native path. The current remote-widget demo must be migrated away from its window.React assumption and use the framework-agnostic SDK contract.

## 13. Distribution, installation, and offline behavior

.oep archives continue to contain course content and static assets. They do not execute arbitrary JavaScript during installation.

An Open-Edu instance may install widgets independently of courses. Widget installation is an administrative operation that accepts a package, validates its manifest, checks policy and integrity, stores the immutable artifact, and publishes it to the instance catalog. A course can then reference the installed widget by exact ID/version without embedding executable code in the course archive.

The install flow may also prefetch verified widget artifacts declared by a course. Widget dependencies are stored separately from course files so multiple courses can share one artifact, course updates do not mutate installed versions, and uninstalling a course does not remove shared dependencies.

The instance registry should support enable, disable, deprecate, and revoke operations. Disablement prevents new resolution; revocation invalidates cached artifacts according to the deployment’s offline policy.

Online-only widgets are permitted only when deployment policy allows runtime network dependencies. Studio and learner UI must make this visible.

## 14. Security model

Threats include malicious publishers, compromised artifacts or metadata, iframe escape attempts, learner-data exfiltration, message flooding, resource exhaustion, and revoked widgets executing from cache.

Controls:

- cross-origin iframe with sandbox="allow-scripts";
- HTTPS-only origins and artifacts;
- mandatory integrity for registry widgets;
- optional publisher signatures;
- registry/origin allowlist;
- schema validation for every host-bound message;
- per-instance nonce and sequence numbers;
- rate, payload, artifact-size, and timeout limits;
- host-enforced capability allowlist;
- no host asset broker in protocol version 1; subresources resolve only at the verified registry origin;
- revocation and cache invalidation;
- no allow-same-origin in protocol version 1;
- no direct host DOM or storage access.

Widget documents carry a restrictive CSP, supplied by the registry or instance serving layer. Multi-file online widgets use this baseline policy:

```text
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

Self-contained offline HTML uses the same restrictions, but replaces script-src 'self' with a build-generated hash, for example script-src 'sha256-<bundle-hash>'. The SDK build computes the hash over the exact inline script bytes and the host verifies the complete document before creating the offline iframe. This permits the required inline bundle without permitting arbitrary inline scripts. Self-contained artifacts embed the CSP as a meta element so it applies in the offline blob/srcdoc path; the registry mirrors the same policy as a response header for online documents. Protocol conformance fixtures must verify both delivery paths resolve to an equivalent policy.

The SDK must ship a `build-helpers` export containing a `computeSelfContainedCspHash(htmlString: string): string` utility. This function parses the inline script element from the serialized HTML and returns the canonical `sha256-<base64>` digest over the exact UTF-8 bytes of the inline script content. Widget authors must use this utility in their self-contained build pipeline to produce the correct hash; producing the hash by any other means risks a CSP/integrity mismatch where the host's document integrity check passes while the browser-enforced CSP blocks the script. The Phase 1 counter example widget must demonstrate use of this utility.

Additional origins require a manifest capability, deployment allowlist, and a documented privacy review. Configuration and storedState are considered visible to the widget and must not contain sensitive learner data. The learner application CSP must include configured widget origins in frame-src; widget documents retain their own CSP independently.

The current same-realm loader may remain for controlled deployments under trusted-remote, but must require integrity, origin policy, API validation, timeout/size limits, and explicit configuration. It is disabled by default in public learner builds.

## 15. Versioning

Three versions are independent:

1. **Widget version:** publisher-owned semver for behavior and schemas.
2. **Protocol version:** Open-Edu host/widget message contract.
3. **Runtime compatibility:** supported host runtime range.

Patch versions are bug fixes, minor protocol versions may add optional fields/messages, and major protocol versions require a new adapter. Widget artifacts are immutable; any artifact or schema change requires a new widget version.

## 16. Migration roadmap

### Phase 0 — Harden current remote loading

- Add explicit trust-tier policy.
- Require integrity for production trusted-remote.
- Validate API version, manifest, origins, timeout, and response size.
- Add metadata validation and telemetry bridging.
- Test policy rejection, version mismatch, duplicate IDs, and integrity formats.

### Phase 1 — SDK and protocol

- Add @open-edu/widget-sdk.
- Add manifest and protocol schemas to packages/schemas.
- Add conformance fixtures.
- Implement SandboxWidgetAdapter behind a feature flag.
- Add one framework-agnostic example widget.
- Add the local development registry and hot-reload workflow.
- Define the self-contained HTML build target for offline-capable widgets.
- Document the migration from the current window.React remote demo to the SDK bootstrap contract.

### Phase 2 — Resolver and cache

- Add WidgetResolver and WidgetPolicy.
- Add static registry catalog loading.
- Add IndexedDB artifact cache with verification.
- Normalize legacy and new references.
- Route native and sandboxed widgets through a common lifecycle.
- Add runtime config validation, fallback transformation, state migration, and revocation grace handling.

### Phase 3 — Studio and authoring

- Add registry discovery and sandbox preview.
- Add JSON Schema-driven configuration.
- Lock exact versions during export.
- Update AI catalog prompts and validation.

### Phase 4 — Governance

- Add publisher signatures and revocation.
- Add automated accessibility, protocol, size, performance, and security verification.
- Publish the contribution guide and registry operator runbook.

## 17. Testing strategy

Every phase adds Vitest coverage; browser isolation and end-to-end behavior use Playwright.

### Schema and resolver tests

- valid/invalid manifests and references;
- semver, HTTPS, origin, integrity, and capability validation;
- legacy remoteWidget normalization;
- native/registry resolution and exact-version behavior;
- cache hit/miss, integrity mismatch, revocation, and fallback.
- local instance registry resolution and registry-origin policy.
- mandatory course-embedded integrity;
- node.config validation and fallback configuration transforms;
- state schema versioning and migration failure behavior;
- self-contained offline document validation.

### Protocol and runtime tests

- valid message round trips;
- wrong origin, nonce, instance, sequence, and payload rejection;
- rate and size limits;
- completion/state validation;
- lifecycle destruction;
- resize clamping;
- locale/theme propagation;
- theme token injection and reduced-motion/forced-colors declarations;
- telemetry normalization;
- timeout/error fallback;
- request/response correlation and destroy-before-ready races;
- host-shell axe-core checks.

### End-to-end tests

1. Install a widget package into a self-hosted Open-Edu instance.
2. Publish the widget in the instance catalog.
3. Install a course referencing that instance widget.
4. Verify and load the artifact.
5. Complete the activity and reload the course.
6. Confirm state and exact widget version persist.
7. Load an offline-capable widget without network.
8. Reject an unauthorized or revoked widget.
9. Confirm the widget cannot access host storage or navigate the top-level page.
10. Confirm widget CSP blocks undeclared network and frame loads.
11. Confirm cached execution is allowed only within the seven-day offline revocation grace window.
12. Measure one-iframe-per-node behavior and idle unmount/remount state restoration on a low-end-device profile.

## 18. Observability

Safe diagnostics record widget ID/version, integrity, protocol version, source/trust tier, load duration, cache result, failure category, fallback usage, and message rejection category.

Diagnostics must not record widget configuration, learner answers, or arbitrary widget payloads unless they pass the existing privacy/telemetry policy. A developer-only diagnostics panel may expose manifest, source, version, cache state, and last safe error.

Safe diagnostics must never be emitted through the `widget_interaction` telemetry event. `widget_interaction` is a learner-action event; routing system-level warnings (such as legacy normalization warnings or missing-integrity warnings) through it corrupts behavioral analytics. All diagnostic signals must flow through a dedicated channel — either a `DiagnosticBus` observable on `RuntimeContext` or the `onDiagnostic` callback already defined on `SandboxWidgetAdapter`. The `WidgetRenderer` must use `onDiagnostic` (or the equivalent context channel) for all resolver and normalization warnings, and must never call `emitTelemetry` with diagnostic payloads.

## 19. Acceptance criteria

- Existing built-in widgets render without behavior changes.
- Existing course packages validate and run unchanged.
- Legacy remoteWidget nodes without integrity continue through explicitly enabled trusted-remote policy with a warning; new external references require manifest integrity.
- A community widget can be published as a static artifact and loaded at runtime.
- An administrator can install and enable a widget on a self-hosted Open-Edu instance without rebuilding the learner application.
- A course can resolve an instance-hosted widget from the instance catalog by exact ID, version, and integrity.
- Registry artifacts resolve to a served iframe document; the runtime does not unzip or serve archive-relative resources.
- Offline-capable widgets use a verified self-contained HTML artifact with no relative subresource dependencies.
- Community code runs outside the learner app’s JavaScript realm.
- Malformed or unauthorized messages cannot mutate host state.
- Exact widget version and integrity persist with answers.
- Fallback answers retain intended-widget and rendered-widget provenance.
- Completion and reward/workflow events expose renderedViaFallback.
- State save requests have correlated acknowledgements, schema versions, and explicit rejection behavior.
- Interactions reach host telemetry through the canonical schema.
- An offline-capable widget works after verified caching.
- A failed widget produces deterministic fallback or localized error.
- Widget documents enforce the baseline CSP and the learner app allows only configured widget frame origins.
- Studio and AI authoring use the same catalog and schemas.
- Protocol, security, accessibility, and fallback behavior have automated coverage.

## 20. Final recommendation

Implement a **registry-backed, sandboxed widget platform** with a **native adapter for trusted widgets**. The registry must support both public registries and self-hosted Open-Edu instance registries. Treat the existing remote loader as a compatibility path, not the foundation of community extensibility.

The key invariant is:

> Community widgets may request learning actions, but only the Open-Edu host may authorize and record them.
