---
sidebar_position: 11
---

# Runtime Renderer (`@open-edu/runtime`)

The React-based runtime handles node rendering, widget loading, progress tracking, accessibility integration, theming, and layout.

## Theming System

The framework ships with **3 built-in themes** that provide full color palettes, typography stacks, spacing, and border radii. Each theme is a `ThemeDefinition` object that gets flattened into 60+ `--oe-*` CSS variables on a wrapper `<div>`.

### Available Themes

| Name          | ID                   | Type  | Description                       | Font Stack                              |
| ------------- | -------------------- | ----- | --------------------------------- | --------------------------------------- |
| OpenEdu Light | `lumina-scholastica` | Light | Default calm everyday learning    | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Dark  | `nocturnal`          | Dark  | Calm dark for deep focus          | Inter + Source Serif 4 + JetBrains Mono |
| OpenEdu Zen   | `zen`                | Light | Reduced-stimulation quiet reading | Inter + Source Serif 4 + JetBrains Mono |

### RuntimeThemeProvider

Wraps your application with the active theme. Accepts a `themeId` prop (defaults to `lumina-scholastica`). Flattens the `ThemeDefinition` into CSS variables, sets `data-theme` attribute on the wrapper, and provides the full `ThemeDefinition` via React context.

```tsx
import { RuntimeThemeProvider } from '@open-edu/runtime';

function App() {
  return (
    <RuntimeThemeProvider themeId="nocturnal">
      <YourContent />
    </RuntimeThemeProvider>
  );
}
```

### useTheme Hook

Access the active `ThemeDefinition` from any descendant:

```tsx
import { useTheme } from '@open-edu/runtime';

function MyComponent() {
  const theme = useTheme();
  // theme.colors.primary, theme.typography.headingLg, etc.
  return <div style={{ color: theme.colors.primary }}>Styled</div>;
}
```

### useThemePreference

A hook that reads/writes the selected theme to `localStorage` under the key `oe-theme-preference`. Falls back to `lumina-scholastica` gracefully on corrupted storage.

```tsx
const [themeId, setThemeId] = useThemePreference();
```

### ThemeSelector

A popover component displaying all 3 themes as preview cards with color swatches, names, and descriptions. The active theme is highlighted with a primary border and checkmark badge. Supports keyboard navigation (Tab, Shift+Tab, Escape) and click-outside-to-close.

```tsx
import { ThemeSelector } from '@open-edu/runtime';

<ThemeSelector currentThemeId={themeId} onThemeChange={setThemeId} />;
```

### Theme Registry

Low-level theme access:

```tsx
import { themeRegistry, getTheme, themeIds, defaultThemeId } from '@open-edu/runtime';

const theme = getTheme('nocturnal');
// theme.colors, theme.typography, theme.spacing, theme.radii
console.log(themeIds); // ['lumina-scholastica', 'nocturnal', 'zen']
```

## Layout Components

### SideNav

Fixed left navigation panel (260px) with:

- Course title
- 5 navigation tabs (overview, modules, progress, bookmarks, settings)
- Course structure children slot
- Resume Last Lesson button
- Active tab highlighted with left border + primary-container background
- Supports both controlled (`activeTab`) and uncontrolled (`defaultActiveTab`) modes

```tsx
import { SideNav } from '@open-edu/runtime';

<SideNav
  courseTitle="Introduction to Math"
  activeTab="overview"
  onTabChange={(tab) => navigate(tab)}
>
  <CourseTree modules={modules} />
</SideNav>;
```

| Prop               | Type                      | Default | Description                           |
| ------------------ | ------------------------- | ------- | ------------------------------------- |
| `courseTitle`      | `string`                  | —       | Course title displayed in the panel   |
| `children`         | `ReactNode`               | —       | Course structure content (CourseTree) |
| `onResumeLesson`   | `() => void`              | —       | Resume last lesson action             |
| `activeTab`        | `NavTabId`                | —       | Controlled active tab                 |
| `defaultActiveTab` | `NavTabId`                | —       | Default tab (uncontrolled mode)       |
| `onTabChange`      | `(tab: NavTabId) => void` | —       | Tab change callback                   |

### TopAppBar

Sticky header with:

- Breadcrumb navigation
- Accessibility controls popover (breadcrumbs toggle, font size A+/A-)
- Custom `actions` slot (e.g. Pipili button)
- Backdrop-blur effect

```tsx
import { TopAppBar } from '@open-edu/runtime';

<TopAppBar
  breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Course' }]}
  showA11yControls
  isCourseView
  courseTitle="Introduction to Math"
  progressCurrent={3}
  progressTotal={12}
/>;
```

| Prop               | Type                    | Default | Description                           |
| ------------------ | ----------------------- | ------- | ------------------------------------- |
| `breadcrumbs`      | `TopAppBarBreadcrumb[]` | —       | Breadcrumb trail                      |
| `showA11yControls` | `boolean`               | —       | Show accessibility controls popover   |
| `actions`          | `React.ReactNode`       | —       | Custom header actions                 |
| `isCourseView`     | `boolean`               | —       | Whether rendered inside a course view |
| `courseTitle`      | `string`                | —       | Course title for the header           |
| `progressCurrent`  | `number`                | —       | Current step in course progress       |
| `progressTotal`    | `number`                | —       | Total steps in course progress        |

### CourseTree

Expandable module/lesson tree for the SideNav:

- First unlocked module expanded by default
- Locked modules show lock icon
- Active lesson highlighted with left border + primary color
- Full keyboard accessibility (`aria-expanded`, `aria-current`)

### AITutorPanel

Right sidebar (320px) with tabbed interface (Ask AI / My Notes / Highlights):

- Chat area with welcome message, user messages (primary bg), AI responses
- Text input with Enter to send, Shift+Enter for newline
- Role="complementary"

### AICallout

Tertiary-container bordered insight box with optional icon, title, and content. Role="complementary".

```tsx
import { AICallout } from '@open-edu/runtime';

<AICallout title="Learning Tip" icon="lightbulb">
  Try breaking the problem into smaller steps.
</AICallout>;
```

### ReadingRuler

Togglable fixed-position horizontal focus band overlay. `aria-hidden` when decorative.

```tsx
import { ReadingRuler } from '@open-edu/runtime';

{
  showRuler && <ReadingRuler />;
}
```

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
        widgetRegistry={widgetRegistry}
        packageId={pkg.manifest.id}
        packageVersion={pkg.manifest.version}
      >
        <LayoutShell />
      </RuntimeProvider>
    </RuntimeThemeProvider>
  );
}
```

| Prop               | Type                            | Description                               |
| ------------------ | ------------------------------- | ----------------------------------------- |
| `loadedPackage`    | `LoadedPackage`                 | The loaded package object                 |
| `engine`           | `WorkflowEngine`                | Workflow engine instance                  |
| `children`         | `ReactNode`                     | Child content                             |
| `widgetRegistry`   | `WidgetRegistry` (optional)     | Widget registry for exercise/custom nodes |
| `initialProgress`  | `ProgressSnapshot` (optional)   | Restore progress from a snapshot          |
| `onProgressChange` | `(snapshot) => void` (optional) | Progress change callback                  |
| `packageId`        | `string` (optional)             | Override package ID                       |
| `packageVersion`   | `string` (optional)             | Override package version                  |
| `skillGraph`       | `SkillGraph` (optional)         | Skill graph for mastery tracking          |

## useRuntime Hook

Access runtime state from any child component:

```typescript
import { useRuntime } from '@open-edu/runtime';

function MyComponent() {
  const {
    loadedPackage, // The current LoadedPackage
    currentNode, // The active node with metadata (or null)
    currentNodeId, // Current node path string
    isCompleted, // Whether workflow is finished
    scores, // Record<string, number> — per-node scores
    lastScore, // Score from the last completed node
    visitedNodes, // Array of completed node paths
    answers, // Record<string, NodeAnswer>
    saveAnswer, // (nodeId, answer) => void
    completeNode, // (score?) => void — complete current node
    navigateToNode, // (nodeId) => void — navigate to specific node
    getNode, // (nodeId) => LoadedNode | undefined
    widgetRegistry, // WidgetRegistry | undefined
    progressSnapshot, // ProgressSnapshot | null
    skillScores, // Record<string, number>
    getSkillMastery, // (skillId) => MasteryLevel
    skillGraph, // SkillGraph | undefined
  } = useRuntime();
}
```

## BundleOverview

For multi-module bundles, the `BundleOverview` component renders a syllabus-style page:

```tsx
import { BundleOverview } from '@open-edu/runtime';
import type { LoadedBundle } from '@open-edu/core';

function MyBundlePage({ bundle }: { bundle: LoadedBundle }) {
  return (
    <BundleOverview
      bundle={bundle}
      modules={modules} // BundleOverviewModule[]
      onStartModule={(moduleId) => startModule(moduleId)}
      snapshot={bundleSnapshot} // optional BundleProgressSnapshot
    />
  );
}
```

Features:

- Module cards with status badges (`locked` / `unlocked` / `completed`)
- Progress bars for in-progress modules
- Prerequisite dependency visualization
- Start / Continue buttons per module

## Node Renderers

| Component             | Renders                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `NodeRenderer`        | Auto-detects node type and delegates to the appropriate renderer         |
| `MarkdownRenderer`    | Renders markdown content with accessible HTML (remark → rehype pipeline) |
| `QuizRenderer`        | Multiple-choice quiz with radio inputs, scoring, and feedback            |
| `ReflectionRenderer`  | Open-ended text prompt with character count                              |
| `WidgetRenderer`      | Delegates to the Widget SDK for exercise and custom nodes                |
| `PlaceholderRenderer` | Fallback for unknown node types                                          |

## Legacy Components

| Component          | Purpose                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `LayoutShell`      | Course header (title + progress bar), node renderer area, and footer (Next button or submit prompt) |
| `ProgressBar`      | Accessible progress indicator with `aria-valuenow` and `aria-label`                                 |
| `Sidebar`          | Legacy sidebar — replaced by `SideNav` + `CourseTree` in the learner app                            |
| `CourseOutline`    | Collapsible sidebar wrapper                                                                         |
| `CourseCard`       | Catalog card showing title, progress badge, Start/Continue button, and badge counts                 |
| `CompletionScreen` | End-of-course summary with skill scores and earned badges                                           |
| `ProgressBadge`    | Inline progress indicator (not-started / in-progress / completed)                                   |

## Progress Snapshots

```typescript
import { buildProgressSnapshot, isValidSnapshot } from '@open-edu/runtime';
import type { ProgressSnapshot } from '@open-edu/schemas';

const snapshot = buildProgressSnapshot('my-package', '1.0.0', {
  currentNodeId: 'nodes/lesson-3.md',
  visitedNodes: ['nodes/lesson-1.md', 'nodes/lesson-2.md'],
  scores: { 'nodes/quiz-1.json': 100 },
  answers: {},
  isCompleted: false,
});
// { packageId, packageVersion, currentNodeId, visitedNodes, scores, answers, isCompleted, updatedAt }

const validNodeIds = new Set(['nodes/lesson-1.md', 'nodes/lesson-2.md', 'nodes/lesson-3.md']);
if (isValidSnapshot(snapshot, validNodeIds)) {
  // Resume from snapshot
}
```

## Living Knowledge Card Components

The runtime includes 5 reusable card UI components for the Recognition Engine.

### KnowledgeCard

A glassmorphism card with category-based color accents, locked/unlocked states, and level stars.

```tsx
import { KnowledgeCard } from '@open-edu/runtime';
import type { CardDefinition } from '@open-edu/schemas';

const card: CardDefinition = {
  /* ... */
};

<KnowledgeCard card={card} level={2} isLocked={false} onClick={() => openViewer(card)} />;
```

Features:

- Category-specific gradient backgrounds (emerald for knowledge, indigo for skill, etc.)
- Locked state with `grayscale` filter, lock icon, and `aria-disabled`
- Level stars (up to `maximumLevel`) in amber on unlocked cards
- Full keyboard accessibility (`role="button"`, tabIndex, Enter/Space handlers)

### KnowledgeCardGrid

Responsive grid with roving tabindex keyboard navigation (arrow keys, Home, End).

```tsx
import { KnowledgeCardGrid } from '@open-edu/runtime';

const items = cards.map((card) => ({
  card,
  level: getLevel(card.id),
  isLocked: getLevel(card.id) === 0,
}));

<KnowledgeCardGrid cards={items} onCardClick={(card) => setSelected(card)} />;
```

### KnowledgeCardViewer

Dialog showing full card details with a mastery level evolution stepper.

```tsx
import { KnowledgeCardViewer } from '@open-edu/runtime';

{
  selectedCard && (
    <KnowledgeCardViewer
      card={selectedCard}
      level={savedProgress[selectedCard.id]?.level ?? 1}
      onClose={() => setSelectedCard(null)}
      onRelatedLessonClick={(nodeId) => navigate(nodeId)}
    />
  );
}
```

Features:

- 5-level mastery stepper (Introduced → Understand → Explain → Apply → Master)
- Current level highlighted with primary border
- Related lessons and quizzes as clickable links
- Tags, difficulty, and type badges

### ProgressRing

SVG circular progress indicator with color transitions (red → amber → green).

```tsx
import { ProgressRing } from '@open-edu/runtime';

<ProgressRing progress={75} size={64} strokeWidth={4} />;
```

### KnowledgeCardUnlockedToast

Non-blocking bottom-right toast notification for card unlock/level-up events.

```tsx
import { KnowledgeCardUnlockedToast } from '@open-edu/runtime';

<KnowledgeCardUnlockedToast
  card={card}
  newLevel={2}
  visible={showToast}
  type="levelUp"
  onDismiss={() => setShowToast(false)}
  autoDismissMs={4000}
/>;
```

Features:

- Slide-in animation (respects `prefers-reduced-motion`)
- Auto-dismiss with configurable timeout
- Escape key dismiss
- `role="status"` with `aria-live="polite"`
- View button for navigating to the Collection Binder

## Embed Adapter

Mount the runtime in any DOM element without importing React directly:

```typescript
import { createRuntime } from '@open-edu/runtime/embed';

const handle = await createRuntime({
  packageSource: './examples/hello-world',
  container: document.getElementById('root')!,
  onProgressChange: (snapshot) => localStorage.setItem('progress', JSON.stringify(snapshot)),
  onTelemetryEvent: (event) => console.log(event),
});

handle.unmount();
```
