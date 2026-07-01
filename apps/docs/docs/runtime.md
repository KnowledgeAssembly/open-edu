---
sidebar_position: 11
---

# Runtime Renderer (`@open-edu/runtime`)

The React-based runtime handles node rendering, widget loading, progress tracking, accessibility integration, theming, and layout.

## Theming System

The framework ships with **4 built-in themes** that provide full color palettes, typography stacks, spacing, and border radii. Each theme is a `ThemeDefinition` object that gets flattened into 60+ `--oe-*` CSS variables on a wrapper `<div>`.

### Available Themes

| Theme              | ID                   | Description                        | Font Stack                                  |
| ------------------ | -------------------- | ---------------------------------- | ------------------------------------------- |
| Lumina Scholastica | `lumina-scholastica` | Modern minimalist — the default    | Inter + Source Serif 4 + JetBrains Mono     |
| High Focus         | `high-focus`         | Accessibility-first, high-contrast | Atkinson Hyperlegible Next + JetBrains Mono |
| Nocturnal          | `nocturnal`          | Dark mode                          | Inter                                       |
| Sylvan Workspace   | `sylvan-workspace`   | Organic forest aesthetic           | Source Serif 4 + Literata + Hanken Grotesk  |

### RuntimeThemeProvider

Wraps your application with the active theme. Accepts a `themeId` prop (defaults to `lumina-scholastica`). Flattens the `ThemeDefinition` into CSS variables, sets `data-theme` attribute on the wrapper, and provides the full `ThemeDefinition` via React context.

```tsx
import { RuntimeThemeProvider } from '@open-edu/runtime';

function App() {
  return (
    <RuntimeThemeProvider themeId="high-focus">
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

### FontLoader

Injects Google Font `<link>` tags matching the active theme's typography families. Cleans up unused font links on theme switch.

```tsx
import { RuntimeThemeProvider, FontLoader } from '@open-edu/runtime';

function App() {
  return (
    <RuntimeThemeProvider themeId={themeId}>
      <FontLoader />
      <YourContent />
    </RuntimeThemeProvider>
  );
}
```

### useThemePreference

A hook that reads/writes the selected theme to `localStorage` under the key `oe-theme-preference`. Falls back to `lumina-scholastica` gracefully on corrupted storage.

```tsx
const [themeId, setThemeId] = useThemePreference();
```

### ThemeSelector

A popover component displaying all 4 themes as preview cards with color swatches, names, and descriptions. The active theme is highlighted with a primary border and checkmark badge. Supports keyboard navigation (Tab, Shift+Tab, Escape) and click-outside-to-close.

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
console.log(themeIds); // ['high-focus', 'lumina-scholastica', 'nocturnal', 'sylvan-workspace']
```

## Layout Components

### SideNav

Fixed left navigation panel (260px) with:

- OpenEdu heading
- 5 navigation tabs (Course Overview, Modules, My Progress, Bookmarks, Settings)
- Course structure children slot
- Resume Last Lesson button
- Active tab highlighted with left border + primary-container background

```tsx
import { SideNav } from '@open-edu/runtime';

<SideNav
  activeTab="course-home"
  onTabChange={handleNavigate}
  modules={modules}
  currentLessonId={currentNodeId}
/>;
```

### TopAppBar

Sticky header with:

- Breadcrumb navigation
- Accessibility controls popover (Reader mode, Reading Ruler toggle, font size A+/A-)
- ThemeSelector integration (theme switcher)
- Search button, Ask AI button, user avatar
- Backdrop-blur effect

```tsx
import { TopAppBar } from '@open-edu/runtime';

<TopAppBar breadcrumbs={breadcrumbs} currentThemeId={themeId} onThemeChange={setThemeId} />;
```

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
    loadedPackage, // The current LoadedPackage
    currentNode, // The active node with metadata
    isCompleted, // Whether workflow is finished
    visitedNodes, // Array of completed node paths
    completeNode, // (score?) => void — complete current node
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

## Living Knowledge Card Components

The runtime includes 5 reusable card UI components for the Recognition Engine.

### Card

A glassmorphism card with category-based color accents, locked/unlocked states, and level stars.

```tsx
import { Card } from '@open-edu/runtime';
import type { CardDefinition } from '@open-edu/schemas';

const card: CardDefinition = { /* ... */ };

<Card card={card} level={2} isLocked={false} onClick={() => openViewer(card)} />;
```

Features:
- Category-specific gradient backgrounds (emerald for knowledge, indigo for skill, etc.)
- Locked state with `grayscale` filter, lock icon, and `aria-disabled`
- Level stars (up to `maximumLevel`) in amber on unlocked cards
- Full keyboard accessibility (`role="button"`, tabIndex, Enter/Space handlers)

### CardGrid

Responsive grid with roving tabindex keyboard navigation (arrow keys, Home, End).

```tsx
import { CardGrid } from '@open-edu/runtime';

const items = cards.map((card) => ({
  card,
  level: getLevel(card.id),
  isLocked: getLevel(card.id) === 0,
}));

<CardGrid cards={items} onCardClick={(card) => setSelected(card)} />;
```

### CardViewer

Dialog showing full card details with a mastery level evolution stepper.

```tsx
import { CardViewer } from '@open-edu/runtime';

{selectedCard && (
  <CardViewer
    card={selectedCard}
    level={savedProgress[selectedCard.id]?.level ?? 1}
    onClose={() => setSelectedCard(null)}
    onRelatedLessonClick={(nodeId) => navigate(nodeId)}
  />
)}
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

### CardUnlockedToast

Non-blocking bottom-right toast notification for card unlock/level-up events.

```tsx
import { CardUnlockedToast } from '@open-edu/runtime';

<CardUnlockedToast
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
import { createRuntime } from '@open-edu/runtime';

const handle = await createRuntime({
  packageSource: './examples/hello-world',
  container: document.getElementById('root')!,
  onProgressChange: (snapshot) => localStorage.setItem('progress', JSON.stringify(snapshot)),
  onTelemetryEvent: (event) => console.log(event),
});

handle.unmount();
```
