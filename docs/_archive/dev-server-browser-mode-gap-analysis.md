# Dev-Server Browser Mode vs. Non-Browser Mode — Gap Analysis

## 1. Executive Summary

The OpenEdu dev-server supports two runtime configurations:

- **Non-browser mode** (default): a local Vite dev server that reads packages from `OPEN_EDU_PACKAGE_DIR` / `OPEN_EDU_BUNDLE_DIR`, persists to the filesystem, and exposes AI features through `/api/studio/ai/*` Vite middleware.
- **Browser mode** (`mode === 'browser'`): a fully client-side studio that stores courses in IndexedDB via `@open-edu/storage`, calls a stateless `/api/ai/*` gateway for AI operations, and is intended for static deployment / serverless hosting.

**Bottom line:** Browser mode covers the "Creator" teacher workflow (templates, library, per-activity editing, course generation, `.oep` import/export) but has significant gaps in the "Developer" workflow and in the AI assistant chat experience. The biggest user-facing gaps are:

1. **AI chat lacks intent parsing and tool calls** — "create a course from my notes" inside the chat only returns text in browser mode.
2. **Developer mode is not a real mode in browser** — toggling to Developer only changes state; the full file editor, bundle preview, and runtime inspectors are unavailable.
3. **Unit-level operations are unsupported** — create unit and export unit `.oep` are missing.
4. **Folder import is unavailable** — only `.oep` file import works in browser mode.
5. **Item generation has reduced context** — the gateway has no on-disk package, so generated items are less contextualized.

## 2. Architecture at a Glance

| Layer               | Non-browser mode                                                          | Browser mode                                                    |
| ------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Entry point**     | `DevApp.tsx` → `StudioApp` / `BundleDevApp` / `SinglePackageDeveloperApp` | `DevApp.tsx` → `BrowserStudioProvider` → `BrowserStudioApp`     |
| **Package source**  | `OPEN_EDU_PACKAGE_DIR` / `OPEN_EDU_BUNDLE_DIR`                            | IndexedDB (`@open-edu/storage`)                                 |
| **StudioApi impl**  | `createLocalStudioApi` (HTTP to Vite middleware)                          | `createBrowserStudioApi` (in-browser store + `BrowserAiClient`) |
| **AI transport**    | `/api/studio/ai/*` (stateful, streaming)                                  | `/api/ai/*` (stateless JSON gateway)                            |
| **Draft storage**   | Server temp dirs, 30-min TTL                                              | IndexedDB `studio-drafts` store                                 |
| **File editor**     | Full `EditorShell` (developer mode)                                       | Per-activity editors only                                       |
| **Runtime preview** | Full bundle/preview + inspectors                                          | `CreatorPreview` only                                           |

## 3. Feature Gap Matrix

| Feature                                  | Non-browser                   | Browser                        | Gap Severity |
| ---------------------------------------- | ----------------------------- | ------------------------------ | ------------ |
| **Course generation from notes**         | Full                          | Full                           | None         |
| **Course generation from uploaded spec** | Full                          | Full                           | None         |
| **AI chat: explain / Q&A**               | Streaming                     | Non-streaming JSON             | Low          |
| **AI chat: intent parsing**              | Full                          | Missing                        | **High**     |
| **AI chat: course draft from chat**      | Full                          | Missing                        | **High**     |
| **AI chat: item draft/edit from chat**   | Full                          | Missing                        | **High**     |
| **AI chat: streaming / stop**            | Full                          | Missing                        | Medium       |
| **Dedicated item add/edit**              | Full                          | Full, but no course context    | Medium       |
| **Draft persistence**                    | In-memory (30 min)            | IndexedDB                      | None         |
| **Draft commit**                         | Filesystem, `force` respected | Browser store, `force` ignored | Low          |
| **Draft discard**                        | Full                          | Full                           | None         |
| **AI status**                            | Full                          | Full when gateway mounted      | None         |
| **Library CRUD**                         | Full                          | Full                           | None         |
| **Template apply**                       | Full                          | Full                           | None         |
| **`.oep` course import/export**          | Export only                   | Import + export                | Low\*        |
| **Folder import**                        | Full                          | Unsupported                    | **High**     |
| **Create unit**                          | Full                          | Unsupported                    | **High**     |
| **Export unit `.oep`**                   | Full                          | Unsupported                    | **High**     |
| **Full package editor (`EditorShell`)**  | Developer mode                | Not available                  | **High**     |
| **Bundle preview + module selector**     | Developer mode                | Not available                  | **High**     |
| **Telemetry / reward inspectors**        | Developer mode                | Not available                  | Medium       |
| **Mode toggle effect**                   | Swaps app shell               | Visual/state only              | **High**     |
| **Recent courses**                       | Local filesystem              | Browser                        | None         |

\* Non-browser `.oep` import is explicitly unsupported; browser mode supports `.oep` import but only for courses, not bundles.

## 4. Detailed Gap Analysis

### 4.1 AI / Assistant Chat (Highest User Impact)

**What works in both modes**

- Dedicated course generation via `generateFromNotes` / `uploadSpec`.
- Dedicated item generation via `generateItemAdd` / `generateItemEdit`.
- AI availability status.

**What's missing in browser mode**

- **Intent parsing:** `createStudioAssistantHandler` in non-browser mode runs `parseIntentFromMessage` to detect `generate_course`, `draft_new`, `edit_existing`, and `explain`. The gateway chat (`gatewayChat`) has no parser; it runs a single-shot completion.
- **Tool calls from chat:** Non-browser mode can generate a course draft or item draft directly from a chat message. Browser mode can only return text.
- **Streaming:** Non-browser mode streams SSE UI-message chunks. Browser mode returns one JSON object and synthesizes a fake stream in `createHostedChatTransport`.
- **Suggested next steps:** Non-browser mode attaches follow-up chips to assistant messages. Browser mode does not.
- **Course context for item generation:** `generateItem()` in the gateway calls the shared `itemGenerate.ts` code with `packageDir: ''`, so existing activity titles are not included in the prompt.

**Files involved**

- Non-browser chat handler: `apps/dev-server/src/studio/ai/chat/handler.ts`
- Browser gateway chat: `apps/dev-server/src/gateway/chat.ts`
- Browser chat transport: `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`
- Shared intent parser: `apps/dev-server/src/studio/ai/chat/intent.ts`

### 4.2 StudioApi Surface

Browser mode implements the full `StudioApi` interface except for three operations that throw `unsupported-in-browser`:

| Missing method       | Non-browser behavior                     | Impact                                          |
| -------------------- | ---------------------------------------- | ----------------------------------------------- |
| `importCourseFolder` | Imports a folder path into the workspace | Blocks folder-based course ingestion in browser |
| `createUnit`         | Creates a bundle unit                    | Blocks unit authoring in browser                |
| `exportUnitOep`      | Exports a unit as `.oep`                 | Blocks unit distribution in browser             |

Additionally:

- `commitCourseDraft` accepts a `force` flag in browser mode but ignores it; it always overwrites the active course.
- `getPreviewPackage` is fully implemented in browser mode but stubbed (`null`) in non-browser local mode.
- `getStorageStatus` is fully implemented in browser mode but stubbed (`{ available: true }`) in non-browser local mode.

**Files involved**

- Interface: `apps/dev-server/src/studio/studioApi.ts`
- Browser impl: `apps/dev-server/src/studio/browserStudioApi.ts`
- Local impl: `apps/dev-server/src/studio/localStudioApi.ts`

### 4.3 UI / Workflow

**Browser mode limitations**

- **Developer mode toggle is non-functional.** In non-browser mode, switching to Developer replaces `StudioApp` with `BundleDevApp` or `SinglePackageDeveloperApp`, mounting `EditorShell`, `DeveloperToolbar`, and `InspectorPanel`. In browser mode, the toggle only changes persisted state; the same `StudioApp` shell remains.
- **No full package editor.** Browser mode only supports per-activity editing through `ActivityEditorRouter`. Bulk file operations, asset upload, manifest editing, and workflow editing require `EditorShell`, which is not mounted.
- **No bundle support.** Browser mode cannot load, preview, or edit multi-module bundles.
- **No telemetry/reward inspectors.** The `InspectorPanel` is only rendered in non-browser developer mode.
- **Import UX differs.** Browser mode shows an `.oep` file picker; non-browser mode shows a folder path input.

**Files involved**

- App routing: `apps/dev-server/src/DevApp.tsx`
- Browser provider: `apps/dev-server/src/studio/browserPreview.tsx`
- Studio shell: `apps/dev-server/src/studio/StudioApp.tsx`
- Editor shell: `apps/dev-server/src/editor/EditorShell.tsx`
- Import dialog: `apps/dev-server/src/studio/components/ImportCourseDialog.tsx`

### 4.4 Storage / Data Layer

**Browser mode**

- Courses are stored as file arrays in IndexedDB (`@open-edu/storage`).
- Drafts are stored in a separate `studio-drafts` object store.
- Operations are synchronous-ish from the UI perspective but async under the hood.
- Storage-status notices are surfaced when IndexedDB is unavailable or quota-exceeded.

**Non-browser mode**

- Courses live on disk under `OPEN_EDU_PACKAGE_DIR`.
- Drafts live in temp directories under `os.tmpdir()` with a 30-minute TTL.
- Vite's file watcher triggers HMR reload on every mutation.
- Storage is assumed always available.

**Key difference:** Browser mode is well-suited for ephemeral, teacher-facing authoring but lacks the durability/backup semantics of non-browser mode (e.g., `archiveCourse` hard-deletes instead of moving to `.archive/`).

### 4.5 Testing Coverage

**Well-covered areas**

- `BrowserStudioProvider` context behavior.
- `createBrowserStudioApi` library/file/outline operations.
- `BrowserAiClient` draft persistence and gateway error handling.
- `createBrowserCourseStore` IndexedDB operations.
- E2E: `tests/e2e/studio-browser.spec.ts` and `tests/e2e/studio-ai.spec.ts`.

**Notable gaps**

- `BrowserStudioApp` / `DevApp` browser-mode render path is not unit-tested.
- `StudioApp` with `browserMode={true}` is not tested.
- `LibraryView` browser-mode branch is not tested.
- `StudioChatProvider` browser-mode integration (transport + `generateDraft` wiring) is only covered at the transport level.
- Browser reward stubs are not tested.
- Bundle import rejection branch in `browserStudioApi.importOep` is not tested.

## 5. Risk Assessment

| Gap                                      | User Impact                                                           | Engineering Risk                                       | Priority |
| ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| AI chat intent/tool support              | High — "Start with AI" appears broken for chat-driven course creation | Medium — requires gateway changes + metadata contract  | **P0**   |
| Developer mode not functional in browser | High — teachers expecting file-level editing are blocked              | High — requires porting `EditorShell` to browser store | **P1**   |
| Unit create/export unsupported           | High — blocks unit-level authoring/distribution                       | Medium — requires bundle storage model in browser      | **P1**   |
| Folder import unsupported                | Medium — friction for importing existing content                      | Low — can be polyfilled with `.oep` conversion         | **P2**   |
| Item generation lacks course context     | Medium — lower quality generated items                                | Low — can pass course files in gateway request         | **P2**   |
| No streaming/stop in chat                | Low — UX degradation, not functional breakage                         | Low — can extend gateway response format               | **P3**   |

## 6. Recommendations

### Immediate (P0)

1. **Complete AI chat parity for course generation.** The recent fix in `StudioChatProvider.tsx` routes course-generation intent to `api.generateCourseDraft`. Extend this to item draft/edit intents and add metadata support to the gateway chat response so the UI can render draft cards.
2. **Add an integration test** that verifies `StudioApp` in browser mode wires `chatApiUrl='/api/ai/chat'` and that a course-generation chat message produces a `CourseDraftResult` in message metadata.

### Short-term (P1)

3. **Decide the fate of Developer mode in browser.** Either hide the toggle in browser mode or implement a browser-compatible `EditorShell` backed by `BrowserCourseStore`.
4. **Implement unit operations in browser.** Add `createUnit` and `exportUnitOep` support, likely by representing units as separate IndexedDB records or nested course structures.
5. **Add browser-mode unit tests** for `BrowserStudioApp`, `StudioApp` with `browserMode`, and `LibraryView` browser path.

### Medium-term (P2)

6. **Improve item generation context.** Pass the current course outline/files to the gateway `/api/ai/item` endpoint or generate items client-side via `BrowserStudioApi` when context is available.
7. **Add folder import polyfill.** Allow selecting a folder in browser mode and converting it to an in-memory package (requires directory picker API or drag-and-drop).

### Long-term / Polish (P3)

8. **Add streaming support to the gateway chat.** Convert `gatewayChat` to an SSE endpoint so browser mode can stream tokens and support stop/cancel.
9. **Attach suggested next steps** to browser-mode assistant messages.
10. **Respect `force` in `commitCourseDraft`** or remove the parameter from the browser implementation to avoid confusion.

## 7. Appendix: Key File References

### Source

- `apps/dev-server/src/DevApp.tsx`
- `apps/dev-server/src/studio/browserPreview.tsx`
- `apps/dev-server/src/studio/browserStudioApi.ts`
- `apps/dev-server/src/studio/browserCourseStore.ts`
- `apps/dev-server/src/studio/browserAiClient.ts`
- `apps/dev-server/src/studio/localStudioApi.ts`
- `apps/dev-server/src/studio/studioApi.ts`
- `apps/dev-server/src/studio/StudioApp.tsx`
- `apps/dev-server/src/studio/ai/StudioChatProvider.tsx`
- `apps/dev-server/src/studio/ai/chat/handler.ts`
- `apps/dev-server/src/studio/ai/chat/intent.ts`
- `apps/dev-server/src/gateway/chat.ts`
- `apps/dev-server/src/gateway/router.ts`
- `apps/dev-server/src/gateway/itemGeneration.ts`
- `apps/dev-server/src/editor/EditorShell.tsx`
- `apps/dev-server/vite.config.ts`

### Tests

- `apps/dev-server/src/studio/browserPreview.test.tsx`
- `apps/dev-server/src/studio/browserStudioApi.test.ts`
- `apps/dev-server/src/studio/browserCourseStore.test.ts`
- `apps/dev-server/src/studio/browserAiClient.test.ts`
- `apps/dev-server/src/studio/studioApi.contract.test.ts`
- `apps/dev-server/src/studio/ai/StudioChatProvider.transport.test.tsx`
- `tests/e2e/studio-browser.spec.ts`
- `tests/e2e/studio-ai.spec.ts`
