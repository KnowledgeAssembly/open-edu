# Epic 5: Runtime Renderer — Design Spec

Version: 0.1.0
Date: 2026-06-22
Status: Approved

---

## Overview

Epic 5 implements the `@open-edu/runtime` package: a React renderer that takes a
`LoadedPackage` (from `@open-edu/core`) and a `WorkflowEngine` (from
`@open-edu/workflow`) and renders educational content to an accessible React UI.

The runtime is **stateless** — all business logic (navigation, scoring, progression)
lives in the `WorkflowEngine`. The renderer subscribes to workflow events and renders
the current node.

## Scope

Five stories from `PLAN.md`:

| Story | Component                                                        |
| ----- | ---------------------------------------------------------------- |
| 5.1   | Runtime context provider + workflow state integration            |
| 5.2   | Markdown rendering pipeline (remark → rehype → accessible React) |
| 5.3   | Quiz node renderer with scoring + answer validation              |
| 5.4   | Reflection node renderer with text input                         |
| 5.5   | Navigation UI + design tokens + layout shell                     |

## Architecture

```
LoadedPackage + WorkflowEngine
        │
        ▼
  RuntimeProvider (React Context)        ← Story 5.1
        │
        ▼
  LayoutShell                            ← Story 5.5
   ├── Header (title + progress)
   ├── Content → NodeRenderer (dispatch) ← Story 5.5
   │     ├── MarkdownRenderer (lesson)   ← Story 5.2
   │     ├── QuizRenderer                ← Story 5.3
   │     ├── ReflectionRenderer          ← Story 5.4
   │     └── PlaceholderRenderer (exercise/custom)
   └── NavBar (Next / Submit)
```

## Public API (src/index.ts)

```typescript
export { RUNTIME_VERSION } from './version';
export { RuntimeProvider, useRuntime } from './context/RuntimeContext';
export type { RuntimeContextValue, RuntimeProviderProps } from './context/RuntimeContext';
export { MarkdownRenderer } from './renderers/MarkdownRenderer';
export { QuizRenderer } from './renderers/QuizRenderer';
export { ReflectionRenderer } from './renderers/ReflectionRenderer';
export { NodeRenderer } from './renderers/NodeRenderer';
export { LayoutShell } from './layout/LayoutShell';
export { ProgressBar } from './layout/ProgressBar';
export { RUNTIME_THEME, RuntimeThemeProvider } from './theme';
```

## Story 5.1 — Runtime Context Provider

### RuntimeContextValue

```typescript
interface RuntimeContextValue {
  loadedPackage: LoadedPackage;
  currentNode: LoadedNode | null; // full node incl. .content + .node
  currentNodeId: string;
  isCompleted: boolean;
  scores: Record<string, number>; // nodeId → score
  lastScore: number | null;
  completeNode: (score?: number) => void;
  getNode: (nodeId: string) => LoadedNode | undefined;
  visitedNodes: string[]; // ordered list of visited node IDs
}
```

### RuntimeProvider

Props: `{ loadedPackage: LoadedPackage; engine: WorkflowEngine; children: ReactNode }`

Behavior:

- On mount: subscribe to engine, call `engine.start()`.
- On `node.entered` event: update `currentNodeId`, push to `visitedNodes`.
- On `node.completed` event: record score in `scores` map and `lastScore`.
- On `workflow.completed` event: set `isCompleted = true`.
- On unmount: unsubscribe, call `engine.stop()`.
- `completeNode(score?)`: delegates to `engine.completeNode(score)`.

### useRuntime()

Hook that reads `RuntimeContext`. Throws if used outside `RuntimeProvider`.

## Story 5.2 — Markdown Rendering Pipeline

### Pipeline

```
markdown string
  → unified()
  → .use(remarkParse)
  → .use(remarkGfm)           // tables, strikethrough, task lists
  → .use(remarkRehype)
  → .use(rehypeReact, { components: accessibleComponentMap })
  → ReactElement
```

Dependencies to add (devDependencies + dependencies where needed at runtime):

- `unified`, `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-react`
- `@types/unist` (dev)

### Accessible component map

Custom React components for hast node types:

- `h1`–`h6`: render with semantic heading + auto-generated `id` (slugified text).
- `img`: require `alt` (fallback to empty string + `aria-hidden` if missing); never
  render broken images without alt.
- `a`: `target="_blank"` + `rel="noopener noreferrer"` for external links.
- `table`: wrap in `<figure role="table">` with `<caption>` if the preceding
  paragraph starts with "Table:".
- `code` (block): `<pre><code>` with `role="img"`? No — use semantic `<pre><code>`.
- Skip raw `dangerouslySetInnerHTML`.

### MarkdownRenderer

Props: `{ content: string; className?: string }`
Returns: `ReactElement` via `useMemo` (re-process only when content changes).

## Story 5.3 — Quiz Renderer

### QuizRenderer

Props: `{ node: QuizNode; onSubmit: (score: number, optionId: string) => void }`

Behavior:

- Renders `node.question` in a `<fieldset>` with `<legend>`.
- Renders each option as a radio input (`<input type="radio">`) inside a `<label>`.
- Single selection only (radio group semantics).
- "Submit" button disabled until an option is selected.
- On submit: evaluate correctness, compute `score` (100 if correct, 0 if incorrect),
  show feedback (correct/incorrect + correct answer highlighted), call `onSubmit`.
- After submission: disable inputs and reveal correct answer.
- `aria-live="polite"` region announces feedback for screen readers.
- Keyboard accessible (radio group + button are native).

Score calculation: `score = selectedOption.correct ? 100 : 0`.

## Story 5.4 — Reflection Renderer

### ReflectionRenderer

Props: `{ node: ReflectionNode; onSubmit: (text: string) => void }`

Behavior:

- Renders `node.prompt` in a `<label>` associated with a `<textarea>`.
- `textarea` has `required`, `minLength` enforced via the submit button being
  disabled while empty.
- Optional character count display.
- "Submit" button calls `onSubmit(text)`.
- After submission: textarea becomes read-only, show "Saved" confirmation.
- Keyboard accessible.

No score is computed for reflections — `completeNode()` is called with no score.

## Story 5.5 — Layout Shell + Design Tokens + Navigation

### Design tokens (CSS variables)

Given the library-package constraint, styling uses **CSS custom properties** as design
tokens (no Tailwind runtime dependency). A `RuntimeThemeProvider` injects a CSS
variable block on a wrapper `<div>` with class `open-edu-runtime`. Consuming apps can
override any token.

Tokens:

```css
.open-edu-runtime {
  --oe-color-bg: #ffffff;
  --oe-color-fg: #1a1a1a;
  --oe-color-primary: #2563eb;
  --oe-color-primary-fg: #ffffff;
  --oe-color-muted: #6b7280;
  --oe-color-border: #e5e7eb;
  --oe-color-success: #16a34a;
  --oe-color-error: #dc2626;
  --oe-radius: 8px;
  --oe-spacing: 1rem;
  --oe-font-sans: system-ui, -apple-system, sans-serif;
}
```

### ProgressBar

Props: `{ current: number; total: number }`
Renders an accessible progress meter (`role="progressbar"` with `aria-valuenow`,
`aria-valuemin`, `aria-valuemax`, `aria-label`).

### LayoutShell

Props: `{ children: ReactNode }` (reads from `useRuntime()`)

Structure:

```
<section class="open-edu-runtime">
  <header>
    <h1>{package.manifest.title}</h1>
    <ProgressBar current={visitedNodes.length} total={loadedPackage.nodes.length} />
  </header>
  <main aria-live="polite">
    {children}   ← NodeRenderer output
  </main>
  <footer>
    {nav buttons}
  </footer>
</section>
```

Navigation:

- For lesson nodes: "Next" button → `completeNode()`.
- For quiz/reflection nodes: the renderer itself provides "Submit", which calls
  `completeNode(score)` / `completeNode()`. The footer "Next" only shows for lesson
  nodes and when the workflow is not completed.
- When `isCompleted`: footer shows a "Completed" message instead of a button.
- Back navigation is **not supported** (WorkflowEngine is forward-only).

### NodeRenderer (dispatcher)

Props: `{ node: LoadedNode | null }`

Switch on `node.node.type`:

- `lesson` → `MarkdownRenderer` with `node.content`
- `quiz` → `QuizRenderer` (wired to `completeNode`)
- `reflection` → `ReflectionRenderer` (wired to `completeNode`)
- `exercise` / `custom` → `PlaceholderRenderer` ("This node type is not yet
  supported by the runtime renderer.")
- `null` → empty state ("Loading…" or completion summary)

## Dependencies

### Add to `packages/runtime/package.json`

```json
{
  "dependencies": {
    "@open-edu/core": "workspace:*",
    "@open-edu/workflow": "workspace:*",
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-gfm": "^4.0.0",
    "remark-rehype": "^11.0.0",
    "rehype-react": "^8.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "@types/unist": "^3.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0"
  }
}
```

`react` and `react-dom` remain peer dependencies (^18.0.0).

## Module Structure

```
src/
├── version.ts
├── index.ts                       // public API re-exports
├── theme.ts                       // RUNTIME_THEME tokens + RuntimeThemeProvider
├── context/
│   ├── RuntimeContext.tsx
│   └── RuntimeContext.test.tsx
├── renderers/
│   ├── MarkdownRenderer.tsx
│   ├── MarkdownRenderer.test.tsx
│   ├── QuizRenderer.tsx
│   ├── QuizRenderer.test.tsx
│   ├── ReflectionRenderer.tsx
│   ├── ReflectionRenderer.test.tsx
│   ├── NodeRenderer.tsx
│   ├── NodeRenderer.test.tsx
│   └── PlaceholderRenderer.tsx
└── layout/
    ├── LayoutShell.tsx
    ├── LayoutShell.test.tsx
    ├── ProgressBar.tsx
    └── ProgressBar.test.tsx
```

## Testing

Every component gets a Vitest test file using `@testing-library/react` and jsdom:

- **RuntimeContext**: verifies provider starts/stops engine, updates state on events,
  exposes `completeNode`, throws when `useRuntime` used outside provider.
- **MarkdownRenderer**: verifies headings, paragraphs, code blocks, links, tables,
  images render; verifies GFM features (strikethrough, task list); verifies alt text
  fallback.
- **QuizRenderer**: verifies option rendering, selection, submit disabled until
  selection, score calculation (correct=100, incorrect=0), feedback display, radio
  group semantics.
- **ReflectionRenderer**: verifies prompt + textarea association, submit disabled
  while empty, read-only after submit.
- **NodeRenderer**: verifies dispatch to correct renderer by node type, placeholder
  for exercise/custom, empty state for null.
- **LayoutShell**: verifies header title, progress bar, footer navigation, completion
  message.
- **ProgressBar**: verifies role, aria attributes, value calculation.

All tests run under the jsdom environment already configured in `vitest.config.ts`.

## Accessibility Checklist

- [ ] All interactive elements are keyboard reachable.
- [ ] Quiz uses native radio group semantics.
- [ ] Feedback uses `aria-live="polite"`.
- [ ] Images have `alt` text (or `aria-hidden` for decorative).
- [ ] Headings use semantic `<h1>`–`<h6>`.
- [ ] Progress bar uses `role="progressbar"` with aria value attributes.
- [ ] Reflection textarea has associated `<label>`.
- [ ] Links open external with `rel="noopener noreferrer"`.

## Out of Scope (handled by later epics)

- axe-core runtime validation (Epic 6)
- Focus management system (Epic 6)
- Telemetry emission hooks (Epic 7) — the context wires to events but does not emit
  telemetry itself; that is the consuming app's responsibility via the engine's
  `subscribe()`.
- Reward triggers (Epic 8)
- Hot reload (Epic 10)
- Widget rendering for `exercise`/`custom` nodes (future `widgets` package)
