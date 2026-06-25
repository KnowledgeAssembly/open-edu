---
sidebar_position: 11
---

# Runtime Renderer (`@open-edu/runtime`)

The React-based runtime handles node rendering, widget loading, progress tracking, and accessibility integration.

## RuntimeProvider

Wrap your course view with `RuntimeProvider` to access all runtime features:

```tsx
import { RuntimeProvider, RuntimeThemeProvider } from '@open-edu/runtime';
import type { LoadedPackage } from '@open-edu/core';
import { WorkflowEngine } from '@open-edu/workflow';

function CourseView({ pkg }: { pkg: LoadedPackage }) {
  const engine = new WorkflowEngine(pkg.workflow, { entry: pkg.manifest.entry });

  return (
    <RuntimeThemeProvider>
      <RuntimeProvider
        loadedPackage={pkg}
        engine={engine}
        initialProgress={initialProgress}
        onProgressChange={handleProgressChange}
      >
        <LayoutShell />
      </RuntimeProvider>
    </RuntimeThemeProvider>
  );
}
```

## useRuntime Hook

Access runtime state from any child component:

```typescript
import { useRuntime } from '@open-edu/runtime';

function MyComponent() {
  const {
    loadedPackage,    // The current LoadedPackage
    currentNode,      // The active node with metadata
    isCompleted,      // Whether workflow is finished
    visitedNodes,     // Array of completed node paths
    completeNode,     // (score?) => void — complete current node
  } = useRuntime();
}
```

## Node Renderers

| Component | Renders |
|---|---|
| `NodeRenderer` | Auto-detects node type and delegates to the appropriate renderer |
| `MarkdownRenderer` | Renders markdown content with accessible HTML (remark → rehype pipeline) |
| `QuizRenderer` | Multiple-choice quiz with radio inputs, scoring, and feedback |
| `ReflectionRenderer` | Open-ended text prompt with character count |
| `WidgetRenderer` | Delegates to the Widget SDK for exercise and custom nodes |
| `PlaceholderRenderer` | Fallback for unknown node types |

## Layout Components

| Component | Purpose |
|---|---|
| `LayoutShell` | Course header (title + progress bar), node renderer area, and footer (Next button or submit prompt) |
| `ProgressBar` | Accessible progress indicator with `aria-valuenow` and `aria-label` |
| `Sidebar` | Course outline with node-by-node progress, `aria-current="step"` on active node |
| `CourseOutline` | Collapsible sidebar wrapper — combines Sidebar with "X of Y complete" summary |
| `CourseCard` | Catalog card showing title, progress badge, Start/Continue button, and badge counts |
| `CompletionScreen` | End-of-course summary with skill scores and earned badges |
| `ProgressBadge` | Inline progress indicator (not-started / in-progress / completed) |

## Progress Snapshots

```typescript
import { buildProgressSnapshot, isValidSnapshot } from '@open-edu/runtime';
import type { ProgressSnapshot } from '@open-edu/schemas';

const snapshot = buildProgressSnapshot(
  packageId,
  packageVersion,
  currentNodeId,
  visitedNodes,
  scores,
);
// { packageId, packageVersion, currentNodeId, visitedNodes, scores, isCompleted, updatedAt }

if (isValidSnapshot(data)) {
  // Resume from snapshot
}
```

## Embed Adapter

Mount the runtime in any DOM element without importing React directly:

```typescript
import { createRuntime } from '@open-edu/runtime';

const handle = await createRuntime({
  packageSource: './examples/hello-world',
  container: document.getElementById('root')!,
  onProgressChange: (snapshot) => localStorage.setItem('progress', JSON.stringify(snapshot)),
  onTelemetryEvent: (event) => console.log(event),
});

handle.unmount();
```

## Theming

```typescript
import { RUNTIME_THEME, RuntimeThemeProvider, useTheme } from '@open-edu/runtime';
import type { RuntimeTheme } from '@open-edu/runtime';

function CustomTheme() {
  const theme = useTheme();
  return <div style={{ color: theme.colors.primary }}>Styled content</div>;
}
```
