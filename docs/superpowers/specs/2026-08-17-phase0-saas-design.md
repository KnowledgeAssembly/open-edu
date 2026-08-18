# OpenEdu hosted Studio: two-phase design spec

**Date:** 2026-08-17  
**Status:** Draft for review  
**Source app:** `apps/dev-server`  
**Related spec:** [`docs/PHASE0-SAAS-SPEC.md`](../../PHASE0-SAAS-SPEC.md)

## 1. Summary

OpenEdu Course Creator Studio will become a browser-hosted authoring experience in two phases.

Phase 1 delivers browser-local course authoring without a course backend. Teachers can create courses from templates, edit activities, validate packages, preview them, import `.oep` files, and export `.oep` files. The existing local `edu dev` workflow remains available.

Phase 2 adds hosted AI authoring through a stateless serverless gateway. The browser owns course and draft state. The gateway receives bounded requests, calls the configured language model, and returns complete draft results. It does not persist courses or drafts.

The design keeps the OpenEdu package format as the source of truth. Studio storage uses a lossless file-oriented representation because the learner app’s installed-course record does not represent every possible package file.

## 2. Goals

- Let a teacher author and export a valid OpenEdu course from a browser
- Preserve the existing local Studio and `edu dev` experience
- Keep course content local to the browser during Phase 1
- Preserve every package file across browser saves and `.oep` round trips
- Reuse existing OpenEdu schemas, loaders, runtime, and distribution utilities
- Make separate Studio and Learner deployments interoperate through `.oep`
- Add AI without introducing server-side course or draft persistence
- Leave a clear boundary for future cloud storage and synchronization

## 3. Non-goals

- User accounts, cloud course storage, or cross-device synchronization
- Collaboration, sharing permissions, classroom rosters, or grading
- A new course authoring format
- Replacing the learner app
- Server-side persistence of browser courses
- AI availability as a prerequisite for manual authoring
- Treating same-named IndexedDB databases on different origins as shared storage

## 4. Decisions

| Decision                      | Choice                                                                |
| ----------------------------- | --------------------------------------------------------------------- |
| Delivery model                | Two phases: browser authoring, then hosted AI gateway                 |
| Browser persistence           | Lossless file-oriented course records in a separate IndexedDB store   |
| Package interchange           | Existing `.oep` format through `OepReader` and `OepWriter`            |
| UI boundary                   | Existing `StudioApi` contract with local and browser implementations  |
| Validation                    | Existing OpenEdu schemas and package validation paths                 |
| AI draft ownership            | Browser owns draft state; gateway remains stateless                   |
| Cross-origin interoperability | `.oep` import/export; same-origin sharing is an optional optimization |
| Local behavior                | Existing filesystem-backed Studio remains the default local path      |
| Browser deployment root       | `apps/dev-server` is the Vercel project root                          |

## 5. User experience

### 5.1 Phase 1 authoring loop

The primary loop is:

1. Open the hosted Studio or run local `edu dev`
2. Create a course from a template or import an `.oep` file
3. Edit the course outline and activities
4. Preview the course as a learner
5. Run the ready check
6. Download the `.oep` file

The Studio should show a clear local-storage notice. It should explain that browser data stays on the current device and that downloading `.oep` is the durable backup and sharing path.

### 5.2 Phase 1 failure behavior

- If IndexedDB is unavailable, the Studio explains that browser persistence is unavailable and disables course creation until the user chooses a supported browser.
- If storage quota is exceeded, the Studio preserves the last successful record, reports the failure, and offers `.oep` export of the in-memory course when possible.
- If validation fails, the Studio keeps the course editable and presents file-specific, plain-language errors.
- If export fails, the Studio keeps the course unchanged and offers retry without reloading the page.
- If the browser reloads during a write, the previous committed record remains available.

### 5.3 Phase 2 AI loop

The AI loop is:

1. Enter notes or request an activity change
2. Send the bounded request to the AI gateway
3. Review the complete returned draft in the Studio
4. Accept, edit, or discard the draft locally
5. Validate and export the resulting course

AI failures never prevent manual editing, template use, import, preview, or export.

## 6. Architecture

```text
                         ┌──────────────────────────┐
                         │ Browser-hosted Studio    │
                         │                          │
                         │ Studio UI                │
                         │   │                      │
                         │   ▼                      │
                         │ StudioApi                │
                         │   │                      │
                         │   ├─ Browser implementation
                         │   │      │               │
                         │   │      ▼               │
                         │   │  Course store        │
                         │   │      │               │
                         │   │      ▼               │
                         │   │  IndexedDB           │
                         │   │                      │
                         │   └─ Local implementation │
                         │          │               │
                         │          ▼               │
                         │      Filesystem           │
                         └──────────┬───────────────┘
                                    │ Phase 2 only
                                    ▼
                         ┌──────────────────────────┐
                         │ AI gateway               │
                         │ bounded request → result │
                         │ no course or draft state │
                         └──────────────────────────┘
```

The architecture has four boundaries:

1. **Studio API boundary:** UI code calls one contract regardless of storage mode.
2. **Course storage boundary:** browser and local implementations persist package content through different mechanisms.
3. **Package boundary:** `.oep` import/export converts between package bytes and the lossless course representation.
4. **AI boundary:** Phase 2 requests and responses cross a stateless server boundary without moving course ownership to the server.

## 7. Lossless course storage

### 7.1 Rationale

The learner app’s `StoredCourse` record is optimized for installed runtime content. It stores a manifest, nodes, selected sidecars, assets, and installation metadata. It does not provide a general container for arbitrary package files.

Studio authoring must preserve files it does not understand. Otherwise, opening and saving a course can remove widgets, localization files, future package fields, or other valid content.

### 7.2 Studio course record

The Studio store uses a record conceptually shaped as follows:

```text
StudioCourseRecord
  id
  version
  title
  files: StudioFile[]
  updatedAt
  source metadata
```

The record stores all package files. Text and binary classification is an optimization for editing and display, not a permission to discard files. Unknown files remain available for export even when the Creator UI does not expose an editor for them.

### 7.3 Path rules

The Studio store accepts only normalized relative paths. It rejects absolute paths, empty paths, traversal segments, backslash variants that normalize to traversal, and duplicate paths with conflicting content.

The same path-safety rules used by `.oep` reading and installation apply when importing files into the Studio store.

### 7.4 Relationship to learner storage

The Studio store and learner `StoredCourse` store are compatible at the package level, not automatically shared across origins.

- If Studio and Learner use the same origin and intentionally share the database, direct IndexedDB reuse may be enabled later.
- If they use different origins, each app has separate browser storage.
- `.oep` is the supported Phase 1 exchange mechanism between separate deployments.

The design does not add a Studio-only conversion that silently drops files. Any learner adapter must either consume the full package representation or explicitly document the supported subset.

## 7.5 Canonical file representation

The canonical Studio representation is a list of file records:

```text
StudioFile[]
  path: normalized relative path
  data: Uint8Array
```

IndexedDB stores the same records with `ArrayBuffer` values because structured clone handles those values consistently. Browser code may build an in-memory path index for frequent lookup, but the persisted representation remains an array so it does not depend on `Map` serialization behavior.

There are not separate text and asset stores. Text decoding is a UI concern. This preserves unknown files and avoids losing package content when a file extension is not recognized.

## 8. Phase 1: browser authoring foundation

### 8.1 Scope

Phase 1 includes:

- Browser-mode Studio build
- Template-based course creation
- Lossless IndexedDB persistence
- Course library listing, open, duplicate, rename, and delete/archive behavior
- File and asset editing needed by existing Creator and Developer modes
- Schema-backed validation
- Learner preview from the current browser course
- `.oep` import and export
- Import/export round-trip preservation
- Local filesystem mode retained without behavior changes

Phase 1 does not include AI gateway requests, hosted drafts, accounts, cloud storage, or multi-device sync.

### 8.2 Browser-safe core refactor

Browser authoring depends on the same package semantics as local authoring, but the current core loaders read from `node:fs` and `node:path`. This refactor is a Phase 1 foundation, not an optional cleanup.

The core package will expose a browser-safe `loadPackageFromFiles()` path. The existing filesystem `loadPackage()` function will become an adapter that reads files from disk and delegates to the shared parsing and validation functions. Pure parsing functions will be extracted from `manifest.ts`, `workflow.ts`, `rewards.ts`, `cards.ts`, and `nodes.ts`. Asset discovery and path normalization will be split from filesystem traversal in `assets.ts`.

The browser-safe path must retain manifest, workflow, rewards, cards, node, entry, route-target, and asset validation. Browser mode must not implement a weaker validation fork in `apps/dev-server`.

### 8.3 Browser preview bridge

The current preview receives `LoadedPackage` from the Vite virtual module, which is backed by filesystem reads. Browser mode will instead build a `LoadedPackage` from the active `StudioFile[]` through the browser-safe core loader.

The browser runtime session owns the current `LoadedPackage`. After a successful create, import, or file write, it reloads the package from the in-memory file set and supplies the new value to `CreatorPreview`. It does not use the Vite virtual module or require a filesystem directory.

The preview bridge is part of Phase 1 acceptance. A course is not considered browser-editable until the same stored package can render through the existing learner preview components.

### 8.4 Course lifecycle

```text
Create/import
     │
     ▼
Validate package shape
     │
     ▼
Write complete course record
     │
     ▼
Edit in memory
     │
     ▼
Atomically replace committed record
     │
     ├── Preview current package
     └── Export complete package as .oep
```

Writes use a last-known-good strategy. A failed write must not replace the previously committed record. The browser should debounce normal editor saves while providing an explicit save state to the user.

### 8.5 Validation

After the browser-safe core refactor, the browser implementation uses the same canonical schemas and package validation rules as local mode. It must validate at least:

- package manifest
- workflow
- content nodes
- rewards and cards when present
- file paths
- required package files
- asset references where existing validation supports them

The browser API returns structured errors with a path, stable category, and user-facing message. Creator mode can translate these into coaching copy; Developer mode can show the path and schema detail.

Core error messages must be filesystem-neutral. Shared error constructors accept a logical `filePath` such as `package.json` or `nodes/intro.md`; they must not embed the host filesystem root or assume that a package has a disk location.

### 8.6 Import and export

Import reads `.oep` bytes with `OepReader`, applies ZIP safety checks, validates the embedded package, and writes the complete file set to the browser store.

Export reads the complete current file set, builds an `.oep` archive with `OepWriter`, and downloads it without sending course content to a server.

An export followed by import must preserve:

- every relative path
- text content byte-for-byte where encoding permits
- binary asset bytes
- package identity and version
- optional files unknown to the Studio UI

### 8.7 Local mode compatibility

The current filesystem-backed implementation remains the local implementation of `StudioApi`. Browser-specific storage and import/export code must not be imported into the local server path unless the browser build selects it.

The factory selection must use ESM-compatible static or asynchronous imports. It must not rely on CommonJS `require()` in browser code.

The shared `StudioApi` contract includes course operations, library operations, preview loading, storage status, and AI methods. Browser implementations must define browser behavior for every method rather than relying on an inferred local return type. `getPackageDir()` returns the local filesystem directory in local mode and `browser://<course-id>` in browser mode.

### 8.8 Browser template pipeline

Templates remain defined by `apps/dev-server/src/studio/templates/catalog.ts` as in-memory file maps. Browser mode reads the selected template from that catalog, converts every file to `StudioFile` bytes, creates the IndexedDB record, and reloads the package from memory. It does not call the filesystem-backed `/api/package/create-from-template` endpoint.

The local template path continues to use the existing Vite middleware and filesystem invalidation behavior.

### 8.9 Session and recent-course state

Browser mode separates course persistence from navigation persistence. `studioSession.ts` stores view and selected-path state only. `recentCourses.ts` must use browser course summaries and browser identifiers rather than filesystem package paths. A browser course identifier must remain stable across reloads and must not be represented as a fake local path.

Browser archive behavior is hard-delete in Phase 1. The browser API removes the course record and reports the operation as deletion; it does not fabricate an `archivedPath` or claim to provide undo. The Studio’s local-storage notice and `.oep` export affordance are the recovery path. Local filesystem mode keeps its existing recoverable archive behavior.

## 9. Phase 2: hosted AI gateway

### 9.1 Scope

Phase 2 includes:

- notes-to-course draft generation
- activity add and edit generation
- Author Assistant chat streaming
- server-side model credentials
- request validation and payload limits
- origin policy and abuse controls
- browser-owned draft review and commit
- graceful degradation when the gateway or model is unavailable

### 9.2 Existing AI code transition

Phase 2 reuses the existing Studio AI domain code in `apps/dev-server/src/studio/ai/`, including prompt builders, conversation types, item-generation logic, quality mapping, and assistant message handling. It does not create a second prompt system.

The current Vite middleware remains the local transport during the transition. Serverless routes become a second transport adapter around shared AI services. Once the hosted routes reach parity, local middleware and hosted handlers can be consolidated where useful, but local `edu dev` behavior remains supported.

### 9.3 Request and response ownership

The browser sends only the context needed for the requested operation. The gateway returns a complete result suitable for local review.

The gateway does not retain a draft registry. A draft response contains all generated files or the complete structured operation needed for the browser to construct them. The browser stores the draft locally until the user accepts or discards it.

The gateway may use ephemeral filesystem space while invoking the course compiler. That space is request-scoped and is deleted before the request completes. It is not a course store or draft store.

The gateway runs in the Node.js runtime, never the Edge runtime. `@open-edu/course-compiler` and its core dependency require Node.js filesystem and path APIs during compilation. Phase 2 cannot be accepted until a deployed function compiles a fixture course successfully.

### 9.4 AI request safeguards

The gateway must enforce:

- maximum request body size
- maximum notes and context length
- maximum generated file count and total response size
- request timeout
- model/provider allowlist
- per-IP or platform-supported rate limits
- spend or invocation budget
- origin and content-type checks
- error responses that do not expose provider credentials or internal paths

Wildcard CORS is not the default. The deployment must define the allowed Studio origins explicitly, with a documented local-development override.

### 9.5 AI failure behavior

- Missing configuration returns an explicit unavailable status.
- Provider failures return a retryable error without changing the local course.
- Invalid model output returns a structured generation error and does not create a partial course.
- Oversized output is rejected before local commit.
- A gateway timeout leaves the current course and any previously saved draft unchanged.

## 10. Security and privacy

Phase 1 keeps course content in browser storage and does not transmit it to OpenEdu servers.

Phase 2 sends only the context required for the selected AI operation to the configured provider through the gateway. The product must disclose that content submitted to AI leaves the browser.

The Studio must not place provider API keys in client-exposed environment variables. Only the gateway can access provider credentials.

`.oep` import and export use the existing archive security model. Imported files must be validated before they enter the browser store, and unsafe paths must be rejected before extraction or persistence.

## 11. Testing strategy

### 11.1 Phase 1 tests

- Course record create, read, update, duplicate, delete, and recovery after failed write
- Path normalization and unsafe-path rejection
- Complete file-map preservation through storage round trips
- Text and binary asset preservation
- `.oep` export/import round trips with unknown files
- Schema validation parity for representative valid and invalid packages
- Browser API behavior against a mocked course store
- Local API behavior unchanged
- Same-origin browser preview from a stored course
- End-to-end flow: create template → edit → validate → export

### 11.2 Phase 2 tests

- Gateway route and method handling
- Request size and context limits
- Missing AI configuration
- Provider success, failure, timeout, and malformed output
- Complete draft response handling in the browser
- Accept, edit, discard, and retry without server-side draft state
- Rate-limit and origin-policy behavior
- End-to-end flow with a mocked gateway

### 11.3 Acceptance criteria

Phase 1 is complete when a user can create or import a course, edit at least two activities, preview it, validate it, export it, re-import it, and observe no package-file loss.

Phase 2 is complete when a user can generate a draft, review it, accept it locally, recover from gateway failure without data loss, and export the accepted course. Manual authoring must continue to work when AI is unavailable.

## 12. Migration and future cloud path

Future cloud persistence should implement a separate `CloudStudioApi` or storage adapter against this same Studio course contract. It must not redefine package files or make the browser implementation depend on server-side drafts.

Cloud synchronization is a later concern. It will require conflict handling, identity, authorization, version history, and explicit privacy policy. None of those concerns belong in Phase 1 or Phase 2.

## 13. Open questions deferred by this design

- Whether hosted Studio and Learner will eventually share an origin
- Whether the learner app should adopt the full lossless package store
- Which AI provider and model policy Phase 2 will use
- Whether cloud synchronization should use the existing registry infrastructure or a new service
- Whether browser storage needs an explicit export reminder or backup cadence
