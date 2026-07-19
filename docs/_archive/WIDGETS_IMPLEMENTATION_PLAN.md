# Widgets Implementation Plan

> Implement 6 experimental widgets to production quality.
> Spec: [widgets-new-spec.md](./widgets-new-spec.md)
> Architecture: [widget-architecture-v2.md](./widget-architecture-v2.md)

---

## Table of Contents

1. [Scope](#scope)
2. [Architecture Reference](#architecture-reference)
3. [Widget Specifications](#widget-specifications)
   - [1. core.callout](#1-corecallout)
   - [2. core.image-compare](#2-coreimage-compare)
   - [3. core.hotspot](#3-corehotspot)
   - [4. core.timeline](#4-coretimeline)
   - [5. science.label-diagram](#5-sciencelabel-diagram)
   - [6. science.image-label](#6-scienceimage-label)
4. [Cross-Cutting Concerns](#cross-cutting-concerns)
5. [Implementation Order](#implementation-order)
6. [Verification Checklist](#verification-checklist)

---

## Scope

Six widgets currently registered as experimental stubs in `packages/widgets/src/builtins/` will be fully implemented:

| Widget ID               | Current Status               | Target Status      |
| ----------------------- | ---------------------------- | ------------------ |
| `core.callout`          | experimental stub (46 lines) | stable, production |
| `core.image-compare`    | experimental stub (46 lines) | stable, production |
| `core.hotspot`          | experimental stub (46 lines) | stable, production |
| `core.timeline`         | experimental stub (46 lines) | stable, production |
| `science.label-diagram` | experimental stub (46 lines) | stable, production |
| `science.image-label`   | experimental stub (46 lines) | stable, production |

Each widget will produce:

- React component with full interactivity
- Zod config schema with runtime validation
- Full `WidgetDefinitionV2` metadata
- Unit tests (observe, interactive, a11y, edge cases)
- Storybook story
- Example course-spec entries
- Compiler integration verification

---

## Architecture Reference

### Widget File Pattern

Every widget lives in `packages/widgets/src/builtins/<Name>/` with two files:

```
<Name>/
├── <Name>.tsx        # Component + config schema + WidgetDefinitionV2
└── <Name>.test.tsx   # Co-located tests
```

### WidgetDefinitionV2 Shape

```ts
const MyWidget: WidgetDefinitionV2 = {
  id: 'domain.widget-name',
  version: '1.0.0',
  name: 'Display Name',
  description: 'What this widget does',
  domain: 'core' | 'math' | 'science' | 'language' | 'social',
  render: MyWidgetComponent,
  learningIntents: [LearningIntent.Observe, ...],
  capabilities: { supportsKeyboard: true, supportsObserveMode: true, ... },
  accessibility: { highContrast: true, screenReader: true, ... },
  analytics: { trackAttempts: true, trackCompletionTime: true, ... },
  reward: { completionXP: 10, confetti: true, ... },
  ai: { difficulty: 'easy', estimatedMinutes: 3, bloomsLevel: 'remember', ... },
  icon: 'lucide-icon-name',
  keywords: ['keyword1', 'keyword2'],
  status: 'stable',
};
```

### Component Signature

```ts
function MyWidgetComponent(props: {
  nodeId: string;
  config: Record<string, unknown>;
  emitInteraction: (data: Record<string, unknown>) => void;
  complete: (score?: number, state?: unknown) => void;
  storedState?: unknown;
}) { ... }
```

### Observe Mode Pattern

All widgets use the `useObserveMode` hook:

```ts
const { handleAcknowledge, showAcknowledgeButton } = useObserveMode({
  isObserve: config.interactive !== true && hasValidContent,
  onComplete: complete,
  onInteract: emitInteraction,
  widgetId: 'core.my-widget',
});
```

When `interactive: false` (or omitted), the widget shows pre-computed answers with an "Acknowledge" button that auto-completes at score 100.

### Image Resolution

Image-based widgets use the existing `/assets/` pipeline. Config fields reference images as relative paths:

```json
{ "image": "assets/images/diagram.png" }
```

The runtime resolves these to `/assets/images/diagram.png` which is served by the dev-server/learner middleware from the package's `assets/` directory. No changes to core or runtime are needed.

### Styling Convention

- Use `style={{}}` with CSS variables for dynamic values: `var(--oe-color-primary, #3b82f6)`
- Use Tailwind utility classes via `className` where appropriate
- Use `cn()` from `@open-edu/design-system` for conditional classes
- Never hardcode hex values without CSS variable fallbacks
- Reference: [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)

### Dependencies Available

Already in `packages/widgets/package.json`:

- `@dnd-kit/core` ^6.1.0
- `@dnd-kit/sortable` ^8.0.0
- `@dnd-kit/utilities` ^3.2.2
- `@open-edu/design-system` workspace:\*
- `zod` ^3.22.0

No new dependencies required.

---

## Widget Specifications

### 1. core.callout

**Purpose:** Highlight important information with styled callout boxes.

**Files:**

- `packages/widgets/src/builtins/Callout/Callout.tsx`
- `packages/widgets/src/builtins/Callout/Callout.test.tsx`

**Config Schema:**

```ts
const calloutSchema = z.object({
  type: z.enum([
    'note',
    'tip',
    'warning',
    'important',
    'definition',
    'example',
    'fun-fact',
    'quote',
    'success',
    'question',
  ]),
  title: z.string().optional(),
  content: z.string().min(1),
  icon: z.string().optional(),
  collapsible: z.boolean().optional().default(false),
  defaultExpanded: z.boolean().optional().default(true),
  colorVariant: z.enum(['default', 'primary', 'success', 'warning', 'error']).optional(),
});
```

**Behavior:**

| Mode        | Behavior                                                        |
| ----------- | --------------------------------------------------------------- |
| Observe     | Render callout with type-specific styling, icon, title, content |
| Interactive | Same as observe (callouts are informational, no scoring)        |

**Type-to-Visual Mapping:**

| Type         | Color Variant | Default Icon     | ARIA Role    |
| ------------ | ------------- | ---------------- | ------------ |
| `note`       | default       | `info`           | `note`       |
| `tip`        | primary       | `lightbulb`      | `note`       |
| `warning`    | warning       | `alert-triangle` | `alert`      |
| `important`  | error         | `alert-circle`   | `alert`      |
| `definition` | default       | `book-open`      | `definition` |
| `example`    | primary       | `example`        | `note`       |
| `fun-fact`   | success       | `sparkles`       | `note`       |
| `quote`      | default       | `quote`          | `blockquote` |
| `success`    | success       | `check-circle`   | `status`     |
| `question`   | primary       | `help-circle`    | `question`   |

**Collapsible Mode:**

When `collapsible: true`:

- Renders a `<button>` toggle with `aria-expanded` and `aria-controls`
- Content wrapped in a region with `id` matching `aria-controls`
- Keyboard: Enter/Space toggles expansion
- `defaultExpanded` controls initial state

**Accessibility:**

- `role="note"` for informational types, `role="alert"` for warning/important
- Icon elements have `aria-hidden="true"`
- Collapsible: `aria-expanded`, `aria-controls`, keyboard toggle
- Screen reader reads title + content in sequence

**Test Cases:**

```
describe('Callout schema')
  - has correct widget id 'core.callout'
  - has a render function
  - status is 'stable'

describe('Callout rendering')
  - renders each type variant with correct content
  - renders title when provided
  - renders icon when provided
  - renders without optional fields

describe('Callout collapsible')
  - renders collapsed when defaultExpanded is false
  - renders expanded when defaultExpanded is true
  - toggles on button click
  - supports Enter key toggle
  - supports Space key toggle
  - has aria-expanded attribute
  - has aria-controls pointing to content region

describe('Callout accessibility')
  - has role="note" for informational types
  - has role="alert" for warning types
  - icons have aria-hidden="true"
  - content is readable by screen readers

describe('Callout edge cases')
  - shows config error for missing content
  - shows config error for invalid type
  - defaults to 'note' type when omitted
```

**Storybook Story:**

- Default: note callout with title and content
- All Types: grid showing all 10 type variants
- Collapsible: expandable callout
- Dark Theme: callout in dark mode
- Mobile: responsive width

**Example Config:**

```json
{
  "widget": "core.callout",
  "config": {
    "type": "tip",
    "title": "Did you know?",
    "content": "Plants make food using sunlight through photosynthesis.",
    "icon": "\ud83c\udf3f"
  }
}
```

---

### 2. core.image-compare

**Purpose:** Compare two images using multiple visualization modes.

**Files:**

- `packages/widgets/src/builtins/ImageCompare/ImageCompare.tsx`
- `packages/widgets/src/builtins/ImageCompare/ImageCompare.test.tsx`

**Config Schema:**

```ts
const imageCompareSchema = z.object({
  leftImage: z.string().min(1),
  rightImage: z.string().min(1),
  leftLabel: z.string().optional(),
  rightLabel: z.string().optional(),
  mode: z.enum(['slider', 'side-by-side', 'overlay', 'before-after']).default('slider'),
  caption: z.string().optional(),
  altText: z.object({
    left: z.string().min(1),
    right: z.string().min(1),
  }),
  showLabels: z.boolean().optional().default(true),
  sliderPosition: z.number().min(0).max(100).optional().default(50),
  interactive: z.boolean().optional().default(false),
});
```

**Mode Implementations:**

| Mode           | Layout                                                  | Interaction                           |
| -------------- | ------------------------------------------------------- | ------------------------------------- |
| `slider`       | Both images stacked, right clipped by draggable divider | Drag divider left/right               |
| `side-by-side` | Flex row, two images adjacent                           | No interaction (comparison is visual) |
| `overlay`      | Both images stacked, opacity toggle                     | Click/drag to fade between images     |
| `before-after` | Like slider, with "Before"/"After" labels               | Drag divider                          |

**Slider Mode Detail:**

- Container with `position: relative`
- Left image: full width, `position: absolute`, `z-index: 1`
- Right image: full width, clipped via `clip: rect(0, ${position}%, 100%, 0)`
- Divider: vertical line at `${position}%` with drag handle
- Mouse: `onMouseDown` on handle starts drag, `onMouseMove` updates position, `onMouseUp` ends
- Touch: `onTouchStart/Move/End` with same logic
- Keyboard: arrow keys move divider by 5% increments

**Side-by-Side Mode Detail:**

- Flex container with `gap: 1rem`
- Each image in a flex column with label below
- Images constrained to `max-height: 400px`, `object-fit: contain`
- Responsive: stacks vertically on mobile (`flex-col` at `md:` breakpoint)

**Overlay Mode Detail:**

- Both images stacked with `position: absolute`
- Top image has `opacity` controlled by a range input or click position
- Toggle button switches which image is on top

**Observe Mode:**

- Slider locked at `sliderPosition`, no drag interaction
- Side-by-side: identical display
- Overlay: fixed opacity, no toggle
- Before-after: slider locked

**Accessibility:**

- Container: `role="img"` with `aria-label` combining both alt texts
- Slider: `role="slider"` with `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-valuenow`
- Keyboard: Left/Right arrow keys adjust slider position by 5%
- Images: proper `alt` text from `altText.left` and `altText.right`
- Labels: visible text labels for screen readers

**Test Cases:**

```
describe('ImageCompare schema')
  - has correct widget id 'core.image-compare'
  - validates required fields (leftImage, rightImage, altText)
  - rejects invalid mode values
  - defaults mode to 'slider'

describe('ImageCompare slider mode')
  - renders both images
  - renders divider at sliderPosition
  - updates position on mouse drag
  - updates position on keyboard arrows
  - has role="slider" with correct ARIA attributes
  - locks in observe mode

describe('ImageCompare side-by-side mode')
  - renders two images in a row
  - shows labels when showLabels is true
  - hides labels when showLabels is false
  - stacks vertically on small viewport

describe('ImageCompare overlay mode')
  - renders both images stacked
  - shows opacity toggle control
  - changes opacity on interaction

describe('ImageCompare before-after mode')
  - renders with Before/After labels
  - behaves like slider mode
  - locks in observe mode

describe('ImageCompare accessibility')
  - has descriptive aria-label
  - slider has aria-valuemin/max/now
  - images have alt text from altText config
  - keyboard navigation works

describe('ImageCompare edge cases')
  - shows config error for missing images
  - shows config error for missing altText
  - handles caption rendering
```

**Storybook Story:**

- Slider Mode: leaf comparison
- Side-by-Side: healthy vs diseased
- Overlay: before/after renovation
- Dark Theme
- Mobile: stacked layout

**Example Config:**

```json
{
  "widget": "core.image-compare",
  "config": {
    "leftImage": "assets/images/healthy-leaf.png",
    "rightImage": "assets/images/diseased-leaf.png",
    "leftLabel": "Healthy Leaf",
    "rightLabel": "Diseased Leaf",
    "mode": "slider",
    "altText": {
      "left": "A healthy green leaf",
      "right": "A diseased leaf with brown spots"
    },
    "caption": "Compare a healthy leaf with a diseased one"
  }
}
```

---

### 3. core.hotspot

**Purpose:** Learner identifies regions inside an image.

**Files:**

- `packages/widgets/src/builtins/Hotspot/Hotspot.tsx`
- `packages/widgets/src/builtins/Hotspot/Hotspot.test.tsx`

**Config Schema:**

```ts
const hotspotItemSchema = z.object({
  id: z.string(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  radius: z.number().optional().default(5),
  label: z.string(),
  correct: z.boolean().optional().default(false),
  description: z.string().optional(),
  hint: z.string().optional(),
});

const hotspotSchema = z.object({
  image: z.string().min(1),
  altText: z.string().min(1),
  hotspots: z.array(hotspotItemSchema).min(1),
  mode: z.enum(['single', 'multiple']).default('single'),
  interactive: z.boolean().optional().default(false),
  hints: z.array(z.string()).optional(),
});
```

**Mode Behavior:**

| Mode       | Observe                                        | Interactive                                                  |
| ---------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `single`   | Correct hotspot highlighted, description shown | Learner clicks one hotspot; correct = success, wrong = retry |
| `multiple` | All correct hotspots highlighted               | Learner selects multiple, submits for scoring                |

**Component Layout:**

```
┌─────────────────────────────┐
│                             │
│      [Image with            │
│       positioned            │
│       hotspot circles]      │
│                             │
└─────────────────────────────┘
┌─────────────────────────────┐
│  Selected: <label>          │
│  <description if any>       │
│  [Submit] (interactive)     │
│  <hints>                    │
└─────────────────────────────┘
```

**Hotspot Rendering:**

- Container: `position: relative`, inline-block
- Image: `<img>` with full container width
- Each hotspot: `position: absolute`, `left: ${x}%`, `top: ${y}%`, `transform: translate(-50%, -50%)`
- Circle: `width: ${radius * 2}rem`, `height: ${radius * 2}rem`, `border-radius: 50%`
- Visual states: default (outline), selected (filled primary), correct (green), incorrect (red), revealed (observe mode highlight)

**Interactive Mode Flow:**

1. `single` mode:
   - Learner clicks a hotspot circle
   - If `correct: true` -> green highlight, show description, complete(100)
   - If `correct: false` -> red flash, "Try again" message, increment attempts
   - After max attempts (3), reveal correct answer

2. `multiple` mode:
   - Learner clicks hotspots to toggle selection (multi-select)
   - Selected hotspots get filled primary color
   - Submit button enabled when at least one selected
   - Score = (correct selections / total correct) \* 100
   - Show feedback with correct/incorrect counts

**State Persistence:**

```ts
const HotspotStateSchema = z.object({
  selectedIds: z.array(z.string()),
  submitted: z.boolean(),
  attemptCount: z.number(),
  hintIndex: z.number(),
});
```

**Accessibility:**

- Image: `<img>` with `altText` from config
- Each hotspot: `role="button"`, `tabIndex={0}`, `aria-label={label}`
- Selected: `aria-pressed="true"`
- Container: `role="group"`, `aria-label="Hotspot regions"`
- Keyboard: Tab navigates hotspots, Enter/Space selects
- Live region announces selection and feedback

**Test Cases:**

```
describe('Hotspot schema')
  - has correct widget id 'core.hotspot'
  - validates image and altText required
  - validates hotspots array min 1
  - defaults mode to 'single'

describe('Hotspot observe mode')
  - renders image
  - highlights correct hotspots
  - shows descriptions for correct hotspots
  - has acknowledge button

describe('Hotspot interactive single mode')
  - renders all hotspot circles
  - clicking correct hotspot shows success
  - clicking incorrect hotspot shows error
  - completes with score 100 on correct
  - allows retry on incorrect
  - reveals answer after max attempts

describe('Hotspot interactive multiple mode')
  - allows selecting multiple hotspots
  - toggles selection on click
  - submit enabled when at least one selected
  - scores proportionally based on correct selections

describe('Hotspot keyboard accessibility')
  - hotspots are focusable with Tab
  - Enter/Space selects hotspot
  - aria-label present on each hotspot
  - aria-pressed reflects selection state

describe('Hotspot edge cases')
  - shows config error for invalid config
  - handles single hotspot
  - handles many hotspots (scroll/zoom)
```

**Storybook Story:**

- India Map: interactive single mode
- Human Body: interactive multiple mode
- Plant Parts: observe mode
- Dark Theme
- Mobile: touch-friendly hotspot sizes

**Example Config:**

```json
{
  "widget": "core.hotspot",
  "config": {
    "image": "assets/images/india-map.png",
    "altText": "Map of India with states",
    "hotspots": [
      {
        "id": "maharashtra",
        "x": 45,
        "y": 55,
        "label": "Maharashtra",
        "correct": true,
        "description": "Capital: Mumbai"
      },
      { "id": "karnataka", "x": 42, "y": 65, "label": "Karnataka", "correct": false },
      { "id": "delhi", "x": 48, "y": 30, "label": "Delhi", "correct": false }
    ],
    "mode": "single",
    "interactive": true,
    "hints": ["Look for the western coast state"]
  }
}
```

---

### 4. core.timeline

**Purpose:** Display chronological information with interactive reordering.

**Files:**

- `packages/widgets/src/builtins/Timeline/Timeline.tsx`
- `packages/widgets/src/builtins/Timeline/Timeline.test.tsx`

**Config Schema:**

```ts
const timelineEventSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  date: z.string().optional(),
  icon: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
});

const timelineSchema = z.object({
  events: z.array(timelineEventSchema).min(2),
  title: z.string().optional(),
  layout: z.enum(['horizontal', 'vertical', 'compact']).default('vertical'),
  showDates: z.boolean().optional().default(true),
  showImages: z.boolean().optional().default(false),
  interactive: z.boolean().optional().default(false),
  hints: z.array(z.string()).optional(),
});
```

**Layout Implementations:**

| Layout       | Structure                                             | Responsive                  |
| ------------ | ----------------------------------------------------- | --------------------------- |
| `vertical`   | Events stacked top-to-bottom, connecting line on left | Full width                  |
| `horizontal` | Events in scrollable row, connecting line on top      | Horizontal scroll on mobile |
| `compact`    | Condensed text-only, minimal spacing                  | Full width                  |

**Vertical Layout:**

```
  ●─── Event 1
  │    Title, date, description
  │
  ●─── Event 2
  │    Title, date, description
  │
  ●─── Event 3
       Title, date, description
```

- Connecting line: `border-left: 2px solid var(--oe-color-outline-variant)`
- Event dot: `width: 12px`, `height: 12px`, `border-radius: 50%`, `background: var(--oe-color-primary)`
- Event card: margin-left with padding

**Horizontal Layout:**

```
  ●─────────●─────────●─────────●
  Event 1    Event 2    Event 3    Event 4
  Date       Date       Date       Date
```

- Connecting line: `border-top: 2px solid`
- Events in flex row with `min-width: 200px`
- Container: `overflow-x: auto` for scroll

**Compact Layout:**

```
  Event 1 → Event 2 → Event 3 → Event 4
```

- Inline text with arrow separators
- Minimal visual treatment

**Interactive Mode:**

Uses `@dnd-kit/sortable` (same pattern as `Sequencing` widget):

1. Events shown in shuffled order
2. Learner drags to reorder
3. Submit button scores based on correct chronological order
4. Score = (correct positions / total) \* 100

**Observe Mode:**

- Events shown in correct order (the order provided in config)
- Non-interactive, acknowledge button

**State Persistence:**

```ts
const TimelineStateSchema = z.object({
  eventOrder: z.array(z.string()),
  submitted: z.boolean(),
  hintIndex: z.number(),
});
```

**Accessibility:**

- Container: `role="list"` with `aria-label="Timeline"`
- Each event: `role="listitem"` with `aria-label="Event: <title>"`
- Connecting line: `aria-hidden="true"`
- Interactive: sortable items have grab handles with `aria-roledescription="sortable"`
- Live region announces reorder status
- Logical reading order matches visual order

**Test Cases:**

```
describe('Timeline schema')
  - has correct widget id 'core.timeline'
  - validates events array min 2
  - defaults layout to 'vertical'

describe('Timeline vertical layout')
  - renders events in order
  - shows connecting line
  - shows dates when showDates is true
  - shows images when showImages is true

describe('Timeline horizontal layout')
  - renders events in a row
  - shows connecting line on top
  - scrolls horizontally on overflow

describe('Timeline compact layout')
  - renders condensed text-only timeline
  - shows arrow separators

describe('Timeline observe mode')
  - shows events in correct order
  - non-interactive
  - has acknowledge button

describe('Timeline interactive mode')
  - shuffles events
  - supports drag reordering
  - scores correctly on submit
  - shows feedback after submission

describe('Timeline accessibility')
  - has role="list" on container
  - events have role="listitem"
  - keyboard navigation works
  - live region for status

describe('Timeline edge cases')
  - shows config error for < 2 events
  - handles events without optional fields
  - renders title when provided
```

**Storybook Story:**

- Water Cycle: vertical layout
- Historical Events: horizontal layout
- Process Steps: compact layout
- Interactive: drag to reorder
- Dark Theme
- Mobile: responsive vertical

**Example Config:**

```json
{
  "widget": "core.timeline",
  "config": {
    "title": "The Water Cycle",
    "events": [
      {
        "id": "evap",
        "title": "Evaporation",
        "icon": "\u2600\ufe0f",
        "description": "Water heats up and rises"
      },
      {
        "id": "cond",
        "title": "Condensation",
        "icon": "\u2601\ufe0f",
        "description": "Water vapor cools and forms clouds"
      },
      {
        "id": "rain",
        "title": "Rain",
        "icon": "\ud83c\udf27\ufe0f",
        "description": "Water falls as precipitation"
      },
      {
        "id": "collect",
        "title": "Collection",
        "icon": "\ud83c\udf0a",
        "description": "Water collects in oceans and lakes"
      }
    ],
    "layout": "vertical",
    "showDates": false,
    "interactive": false
  }
}
```

---

### 5. science.label-diagram

**Purpose:** Drag labels onto a scientific illustration.

**Files:**

- `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.tsx`
- `packages/widgets/src/builtins/LabelDiagram/LabelDiagram.test.tsx`

**Config Schema:**

```ts
const labelSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  target: z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
  }),
  hint: z.string().optional(),
  description: z.string().optional(),
});

const labelDiagramSchema = z.object({
  image: z.string().min(1),
  altText: z.string().optional(),
  labels: z.array(labelSchema).min(1),
  interactive: z.boolean().optional().default(false),
  hints: z.array(z.string()).optional(),
});
```

**Component Layout:**

```
┌─────────────────────────────────┐
│                                 │
│    [Image with target markers]  │
│    (numbered circles at x,y)    │
│                                 │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  Label Bank:                    │
│  [Label 1] [Label 2] [Label 3] │
│                                 │
│  Drop targets:                  │
│  Target 1: ___                  │
│  Target 2: ___                  │
│  Target 3: ___                  │
│                                 │
│  [Submit]                       │
└─────────────────────────────────┘
```

**Observe Mode:**

- Image rendered with target markers
- Labels pre-attached to their targets
- Lines connect each label to its target position
- Descriptions shown below each label
- Acknowledge button

**Interactive Mode:**

- Image rendered with numbered target markers
- Label bank shows unplaced labels as draggable chips
- Learner drags labels from bank to targets
- Uses `@dnd-kit/core` with `useDraggable` + `useDroppable` (same pattern as DragDrop widget)
- Correct placement: label snaps, green indicator
- Wrong placement: label bounces back, "try again"
- Submit scores proportionally

**Target Markers:**

- `position: absolute`, `left: ${x}%`, `top: ${y}%`
- Numbered circle: `width: 24px`, `height: 24px`, `border-radius: 50%`
- Background: `var(--oe-color-primary-container)`
- Border: `2px solid var(--oe-color-primary)`
- Number text centered inside

**State Persistence:**

```ts
const LabelDiagramStateSchema = z.object({
  placedLabels: z.record(z.string(), z.string()), // labelId -> targetId
  submitted: z.boolean(),
  hintIndex: z.number(),
});
```

**Accessibility:**

- Image: `<img>` with `altText`
- Each target: `role="button"`, `aria-label="Target: drop label here"`
- Each label: `role="button"`, `aria-label="Label: <text>"`
- Placed labels: `aria-label="<text> placed at target <n>"`
- Keyboard: Tab between labels, Enter to pick up, Tab to target, Enter to place
- Live region announces placement

**Test Cases:**

```
describe('LabelDiagram schema')
  - has correct widget id 'science.label-diagram'
  - validates image and labels required
  - validates target coordinates

describe('LabelDiagram observe mode')
  - renders image with labels attached
  - shows connecting lines
  - has acknowledge button
  - auto-completes on acknowledge

describe('LabelDiagram interactive mode')
  - renders unplaced labels in bank
  - renders target markers on image
  - dragging label to correct target snaps it
  - dragging label to wrong target bounces back
  - scores proportionally on submit
  - shows feedback after submission

describe('LabelDiagram keyboard accessibility')
  - labels are focusable
  - Enter picks up label
  - Tab navigates targets
  - Enter places label
  - aria-labels on all interactive elements

describe('LabelDiagram edge cases')
  - shows config error for invalid config
  - handles single label
  - handles many labels (scroll)
```

**Storybook Story:**

- Plant Anatomy: observe mode with pre-placed labels
- Heart Diagram: interactive mode
- Animal Cell: dark theme
- Mobile: responsive label bank

**Example Config:**

```json
{
  "widget": "science.label-diagram",
  "config": {
    "image": "assets/images/plant-anatomy.png",
    "altText": "Diagram of a plant with parts to label",
    "labels": [
      { "id": "roots", "text": "Roots", "target": { "x": 50, "y": 90 }, "hint": "Below the soil" },
      {
        "id": "stem",
        "text": "Stem",
        "target": { "x": 50, "y": 60 },
        "hint": "Supports the plant"
      },
      {
        "id": "leaves",
        "text": "Leaves",
        "target": { "x": 30, "y": 40 },
        "hint": "Green and flat"
      },
      { "id": "flower", "text": "Flower", "target": { "x": 50, "y": 20 }, "hint": "Colorful top" }
    ],
    "interactive": true
  }
}
```

---

### 6. science.image-label

**Purpose:** Clickable educational image with fixed labels and info cards.

**Files:**

- `packages/widgets/src/builtins/ImageLabel/ImageLabel.tsx`
- `packages/widgets/src/builtins/ImageLabel/ImageLabel.test.tsx`

**Config Schema:**

```ts
const regionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  audio: z.string().optional(),
  video: z.string().optional(),
  tooltip: z.string().optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100).optional().default(10),
  height: z.number().min(0).max(100).optional().default(10),
});

const imageLabelSchema = z.object({
  image: z.string().min(1),
  altText: z.string().optional(),
  regions: z.array(regionSchema).min(1),
  interactive: z.boolean().optional().default(false),
});
```

**Observe Mode (Explorer):**

- Image rendered with clickable region overlays
- Regions shown as semi-transparent highlight rectangles
- Clicking a region opens an info card/popover with:
  - Title
  - Description (if provided)
  - Image thumbnail (if provided)
  - Audio player (if provided)
  - Video embed (if provided)
- No scoring, purely exploratory

**Interactive Mode (Quiz):**

- Image rendered with hotspot circles at region positions
- Prompt shown: "Click on <description>"
- Learner clicks the correct region
- Correct: green highlight, info card shown
- Incorrect: red flash, "Try again"
- Score based on correct identifications

**Info Card Component:**

```
┌─────────────────────────┐
│  ✕                       │
│  ## Title                │
│                         │
│  Description text here  │
│                         │
│  [Image if provided]    │
│  [Audio if provided]    │
│  [Video if provided]    │
│                         │
└─────────────────────────┘
```

- Rendered as a popover or modal dialog
- `role="dialog"`, `aria-labelledby` pointing to title
- Close button with keyboard support (Escape to close)
- Positioned near the clicked region

**Region Overlays:**

- `position: absolute`, `left: ${x}%`, `top: ${y}%`
- `width: ${width}%`, `height: ${height}%`
- Default: semi-transparent border, no fill
- Hover: slight background tint
- Selected: filled with primary color at low opacity
- Tooltip: shown on hover/focus if `tooltip` field provided

**State Persistence:**

```ts
const ImageLabelStateSchema = z.object({
  selectedRegionId: z.string().nullable(),
  submitted: z.boolean(),
  identifiedRegions: z.array(z.string()),
  attemptCount: z.number(),
});
```

**Accessibility:**

- Image: `<img>` with `altText`
- Each region: `role="button"`, `tabIndex={0}`, `aria-label={title}`
- Tooltip: `aria-describedby` pointing to tooltip content
- Info card: `role="dialog"`, `aria-labelledby`, focus trap
- Keyboard: Tab navigates regions, Enter/Space opens info card, Escape closes
- Live region announces region selection

**Test Cases:**

```
describe('ImageLabel schema')
  - has correct widget id 'science.image-label'
  - validates image and regions required
  - validates region coordinates

describe('ImageLabel observe mode (explorer)')
  - renders image
  - renders region overlays
  - clicking region opens info card
  - info card shows title and description
  - info card shows image thumbnail if provided
  - closing info card returns focus to region
  - escape key closes info card

describe('ImageLabel interactive mode (quiz)')
  - shows prompt to identify region
  - correct selection shows success
  - incorrect selection shows error
  - scores correctly
  - shows feedback after submission

describe('ImageLabel accessibility')
  - regions are focusable
  - Enter/Space opens info card
  - info card has role="dialog"
  - focus trapped in info card
  - Escape closes info card
  - aria-labels on regions

describe('ImageLabel edge cases')
  - shows config error for invalid config
  - handles single region
  - handles overlapping regions
  - handles regions with no description
```

**Storybook Story:**

- Solar System: explorer mode with planet info cards
- Human Body: interactive quiz mode
- Machine Parts: dark theme
- Mobile: responsive info cards

**Example Config:**

```json
{
  "widget": "science.image-label",
  "config": {
    "image": "assets/images/solar-system.png",
    "altText": "Solar system with clickable planets",
    "regions": [
      {
        "id": "mars",
        "title": "Mars",
        "description": "The Red Planet, 4th from the Sun",
        "x": 45,
        "y": 30,
        "tooltip": "Click to learn about Mars"
      },
      {
        "id": "jupiter",
        "title": "Jupiter",
        "description": "Largest planet in our solar system",
        "x": 60,
        "y": 50,
        "tooltip": "Click to learn about Jupiter"
      },
      {
        "id": "earth",
        "title": "Earth",
        "description": "Our home planet, 3rd from the Sun",
        "x": 35,
        "y": 40,
        "tooltip": "Click to learn about Earth"
      }
    ],
    "interactive": false
  }
}
```

---

## Cross-Cutting Concerns

### Metadata Requirements

All 6 widgets must have complete metadata when transitioning to `stable`:

**Capabilities (all widgets):**

```ts
{
  supportsObserveMode: true,
  supportsKeyboard: true,
  supportsScreenReader: true,
  supportsOffline: true,
  supportsTouch: true,
  supportsMouse: true,
  supportsAnalytics: true,
  supportsRewards: true,
  supportsAccessibility: true,
  // Widget-specific:
  supportsHints: true,       // Hotspot, Timeline, LabelDiagram
  supportsRetry: true,       // Hotspot, LabelDiagram
  supportsScoring: true,     // Hotspot, Timeline, LabelDiagram, ImageLabel (interactive)
}
```

**Accessibility (all widgets):**

```ts
{
  highContrast: true,
  keyboardOnly: true,
  screenReader: true,
  focusManagement: true,
  ariaSupport: true,
}
```

**Analytics (all widgets):**

```ts
{
  trackAttempts: true,
  trackCompletionTime: true,
  trackSuccessRate: true,
  trackHints: true,         // Widgets with hints
  trackRetries: true,       // Widgets with retry
}
```

**Reward (all widgets):**

```ts
{
  completionXP: 10,
  confetti: true,
  achievement: '<widget-specific>',
  positiveMessage: '<widget-specific>',
}
```

**AI (all widgets):**

Must include: `difficulty`, `estimatedMinutes`, `bloomsLevel`, `cognitiveLoad`, `recommendedAge`, `readingLevel`, `learningObjectives` (min 2), `commonMisconceptions` (min 1), `generationHints` (min 2), `exampleConfigs` (min 1), `authoringPrompt`, `subjectTags`.

### Storybook Stories

Stories live in `packages/design-system/src/stories/`. Each widget gets one story file with multiple variants:

- `callout.stories.tsx`
- `image-compare.stories.tsx`
- `hotspot.stories.tsx`
- `timeline.stories.tsx`
- `label-diagram.stories.tsx`
- `image-label.stories.tsx`

Each story file includes:

- Default variant (observe mode)
- Interactive variant
- Dark theme variant (via theme toolbar)
- Mobile variant (viewport addon)

### Example Course Specs

Add to `examples/widget-showcase/nodes/`:

- `callout.json` -- exercise node with callout config
- `image-compare.json` -- custom node with image-compare config
- `hotspot.json` -- exercise node with hotspot config
- `timeline.json` -- exercise node with timeline config
- `label-diagram.json` -- exercise node with label-diagram config
- `image-label.json` -- exercise node with image-label config

### Compiler Integration

Verify the 6 new widgets work with the existing `WidgetActivity` schema in `packages/course-compiler/src/schemas/course-model.ts`. No code changes expected -- the compiler already supports any `widgetId` string. Add a test case in `packages/course-compiler/src/` that compiles a course-spec referencing each new widget.

### Registry Updates

The registry in `packages/widgets/src/registry.ts` already registers all 6 stubs via `registerAllBuiltins`. No registry changes needed -- the existing registrations will automatically pick up the full implementations.

The `builtins/index.ts` already exports all 6 widgets. No export changes needed.

### Test Infrastructure

- Test runner: Vitest with jsdom environment
- Setup: `packages/widgets/src/test-setup.ts` (imports `@testing-library/jest-dom/vitest`)
- Coverage thresholds: 75% statements, 65% branches, 75% functions, 75% lines
- Run tests: `pnpm --filter @open-edu/widgets test`

---

## Implementation Order

### Batch 1: Foundation (Simple Widgets)

| Widget               | Est. Hours | Rationale                                                                                                               |
| -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `core.callout`       | 1-2h       | Simplest widget, no drag-drop, no image positioning. Establishes the pattern for metadata enrichment and test coverage. |
| `core.image-compare` | 3-4h       | Medium complexity, CSS-based image comparison, no drag-drop dependency. Good introduction to image handling.            |

### Batch 2: Complex Interactive

| Widget          | Est. Hours | Rationale                                                                                                       |
| --------------- | ---------- | --------------------------------------------------------------------------------------------------------------- |
| `core.timeline` | 4-5h       | Uses `@dnd-kit/sortable` (reference: Sequencing widget). Three layout modes add complexity.                     |
| `core.hotspot`  | 4-5h       | Custom click handling with positioned elements. No drag-drop library, but coordinate math and multi-mode logic. |

### Batch 3: Image + Drag

| Widget                  | Est. Hours | Rationale                                                                                                        |
| ----------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `science.image-label`   | 3-4h       | Click-to-explore with info cards. Simpler than LabelDiagram (no drag).                                           |
| `science.label-diagram` | 5-6h       | Most complex: combines `@dnd-kit` drag-drop with image positioning. Reference both DragDrop and Hotspot widgets. |

**Total estimated: 20-26 hours**

---

## Verification Checklist

### Per-Widget

- [ ] Component renders correctly in observe mode
- [ ] Component renders correctly in interactive mode
- [ ] Zod schema validates valid configs
- [ ] Zod schema rejects invalid configs with clear error
- [ ] Config error fallback renders for bad configs
- [ ] `useObserveMode` hook integrated correctly
- [ ] `emitInteraction` called on user actions
- [ ] `complete` called with correct score and state
- [ ] `storedState` hydrated correctly on remount
- [ ] Keyboard navigation works (Tab, Enter, Space, Arrow keys)
- [ ] ARIA attributes present and correct
- [ ] Screen reader announces content and state changes
- [ ] Light theme renders correctly
- [ ] Dark theme renders correctly
- [ ] RTL layout works (mirrored for RTL languages)
- [ ] Responsive on mobile viewports
- [ ] `role="alert"` on config error
- [ ] `data-testid` attributes on key elements

### Global

- [ ] `pnpm --filter @open-edu/widgets test` -- all tests pass
- [ ] `pnpm --filter @open-edu/widgets typecheck` -- no type errors
- [ ] `pnpm lint` -- no lint errors
- [ ] `pnpm format:check` -- formatting correct
- [ ] All 21 builtins still registered (registry-stubs.test.ts passes)
- [ ] Metadata enrichment test passes for stable widgets
- [ ] Storybook stories render correctly
- [ ] Example configs load in dev-server
- [ ] No dead code, no debug logs, no TODO comments
