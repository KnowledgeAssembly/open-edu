# Documentation Gap Analysis — Implementation Plan

> **For agentic workers:** Implement all documentation gaps identified in the Docusaurus docs audit.

**Goal:** Bring Docusaurus docs into parity with the current codebase — add 3 missing example docs, learner app docs, update architecture, expand widget docs, and fix sidebar.

**Architecture:** All changes are within `apps/docs/docs/` (markdown content), `apps/docs/sidebars.ts` (navigation), and one update to `apps/docs/docs/architecture.md` (diagram).

**Tech Stack:** Docusaurus 3.x, Markdown

---

### Task 1: Add autism-reading example doc

**Files:**

- Create: `apps/docs/docs/examples/autism-reading.md`
- Modify: `apps/docs/sidebars.ts`

- [ ] **Create `autism-reading.md`**

```markdown
---
sidebar_position: 8
---

# Autism Reading

**Accessibility-first reading lesson with reflection.** Designed with clear typography, simple language, and a calm visual style suitable for autism spectrum learners. Includes a reading passage, comprehension quiz, and reflection prompt.

**Workflow pattern:** Linear → quiz → reflection → COMPLETED
```

- [ ] **Add to sidebar:** Add `'examples/autism-reading'` after `'examples/adaptive-study'`

---

### Task 2: Add living-vs-nonliving example doc

**Files:**

- Create: `apps/docs/docs/examples/living-vs-nonliving.md`
- Modify: `apps/docs/sidebars.ts`

- [ ] **Create `living-vs-nonliving.md`**

```markdown
---
sidebar_position: 9
---

# Living vs Non-Living

**Multi-activity science lesson with observation, guided practice, independent practice, and mastery check.** Learners progress through a linear chain of six nodes: intro, observation exercise, guided practice, independent practice, mastery check quiz, and outro. Includes badge rewards for completion.

**Workflow pattern:** Linear chain of 6 nodes + badge rewards
```

- [ ] **Add to sidebar:** Add `'examples/living-vs-nonliving'` after `'examples/autism-reading'`

---

### Task 3: Add widget-showcase example doc

**Files:**

- Create: `apps/docs/docs/examples/widget-showcase.md`
- Modify: `apps/docs/sidebars.ts`

- [ ] **Create `widget-showcase.md`**

```markdown
---
sidebar_position: 10
---

# Widget Showcase

**Demonstrates all 14 built-in widgets in the Open-Edu runtime.** A linear package with 16 nodes that walks through every available widget type: Visual Counting, Multiple Choice, Matching, Drag & Drop, Sequencing, Fill in the Blank, Story Question, Real World, Fraction Visual, Place Value Chart, Grid Area, Chart Reader, Clock Time, and Measurement Scale. Each widget node uses the same configuration format documented in the Widget SDK.

**Workflow pattern:** Linear chain of 14 widget demos → COMPLETED

**Widgets demonstrated:** `open-edu.visual-counting`, `open-edu.multiple-choice`, `open-edu.matching`, `open-edu.drag-drop`, `open-edu.sequencing`, `open-edu.fill-blank`, `open-edu.story-question`, `open-edu.real-world`, `open-edu.fraction-visual`, `open-edu.place-value-chart`, `open-edu.grid-area`, `open-edu.chart-reader`, `open-edu.clock-time`, `open-edu.measurement-scale`
```

- [ ] **Add to sidebar:** Add `'examples/widget-showcase'` after `'examples/widget-practice'`

---

### Task 4: Add Learner App documentation page

**Files:**

- Create: `apps/docs/docs/learner.md`
- Modify: `apps/docs/sidebars.ts`

- [ ] **Create `learner.md`**

````markdown
---
sidebar_position: 6
---

# Learner App

The **learner app** (`@open-edu/learner`) is a standalone application that provides the full course-taking experience — catalog browsing, course navigation, progress tracking, and reward integration.

## Quick Start

```bash
pnpm --filter @open-edu/learner dev
```
````

Opens at `http://localhost:4001`. The app scans all example packages in the repository and presents them as a browsable catalog.

## Architecture

The learner app is built on top of the Open-Edu runtime packages:

```
@open-edu/learner
  ├── @open-edu/core       — scanPackages, loadPackage
  ├── @open-edu/workflow   — WorkflowEngine, getOrderedNodes
  ├── @open-edu/runtime    — RuntimeProvider, LayoutShell, components
  ├── @open-edu/rewards    — RewardBroker for badge delivery
  ├── @open-edu/telemetry  — TelemetrySession for event capture
  ├── @open-edu/accessibility — AccessibilityProvider
  └── @open-edu/widgets    — createDefaultRegistry
```

## Course Catalog

On startup, the app uses `scanPackages()` to discover all valid packages in the `../../examples` directory. Each package is displayed as a **CourseCard** showing its title, progress badge (not started / in progress / completed), and a Start or Continue button.

## Course View

Clicking a course loads it via `loadPackage()` and renders:

- **Sidebar** — course outline with node-by-node progress and `aria-current` indication
- **LayoutShell** — course title, progress bar, and active node renderer
- **Node renderers** — markdown for lessons, quiz with scoring, reflection with text input, widget renderer for exercises

### Node Navigation

- **Lesson nodes** — "Next" button advances to the next node
- **Quiz nodes** — Select an answer and click "Submit" to score
- **Reflection nodes** — Type a response and click "Submit"
- **Exercise nodes** — Interact with the widget and submit

## Progress Persistence

Progress is saved to `localStorage` under the key `open-edu-progress` (a JSON map of package IDs to `ProgressSnapshot`). On return visits, the app resumes from the last uncompleted node.

## Rewards & Badges

If a package includes `rewards.json`, the app creates a `RewardBroker` that listens for events from the `WorkflowEngine`. When a badge is earned, a toast notification appears in the bottom-right corner for 3 seconds, and the badge is recorded for display on the completion screen.

## Completion Screen

After the workflow reaches `COMPLETED`, the app renders a **CompletionScreen** showing:

- Course title
- Skill scores summary (if any skills were assessed)
- List of earned badges (if any)
- "Back to catalog" button

## Virtual Module

The app uses a Vite plugin (`eduDataPlugin`) that exposes a virtual module `virtual:edu-data` at dev time. This module exports:

- `catalogPackages` — `PackageSummary[]` for the catalog grid
- `packageEntries` — `Record<string, LoadedPackage>` keyed by package ID

This avoids filesystem access in the browser while keeping the dev server as the single source of truth for package data.

`````

- [ ] **Add to sidebar:** Add `'learner'` to the docs array in `sidebars.ts`, before `'package-format'`

---

### Task 5: Update architecture diagram

**Files:**
- Modify: `apps/docs/docs/architecture.md`

- [ ] **Update the architecture diagram** (lines 9-34) to include Learner App, scanPackages, getOrderedNodes, and runtime layout components

Replace the diagram block with:

````markdown
`````

Educational Package (Markdown + JSON)
│
▼
┌──────────────┐
│ Core │ Package loader, scanner, patcher, lint, generator
├──────────────┤
│ scanPackages │ Discover all packages in a directory → catalog
└──────┬───────┘
│
▼
┌──────────────┐
│ Workflow │ XState + skill tracking + mastery routing
├──────────────┤
│ getOrderedNodes │ Topological sort for course outline
└──────┬───────┘
│
▼
┌──────────────────┐
│ Runtime │ React renderer — lessons, quizzes, widgets
├──────────────────┤
│ Sidebar │ Course outline with progress
│ CourseCard │ Catalog card with badge counts
│ CourseOutline │ Collapsible sidebar layout
│ CompletionScreen │ End-of-course summary
│ ProgressBadge │ Inline progress indicator
└──┬───┬───┬───────┘
▼ ▼ ▼
┌────┐┌────┐┌──────────┐
│A11y││Widgets││Telemetry │
└────┘└────┘└───┬─────┘
▼
┌──────────┐
│ Rewards │ Badges, conditions, verification
└──────────┘
│
▼
┌──────────────┐
│ Learner │ Standalone app — catalog + course view
│ App │ Progress persistence + toast notifications
└──────────────┘

```

```

---

### Task 6: Update quick start in intro.md

**Files:**

- Modify: `apps/docs/docs/intro.md`

- [ ] **Update the Quick Start section** (around line 43) to include the learner app path

Change the existing block to add the simpler learner app dev command:

```bash
git clone https://github.com/spatnaik1982/open-edu
cd open-edu
pnpm install
pnpm build

# Start the learner app (course catalog with full runtime)
pnpm --filter @open-edu/learner dev

# Or run the dev server for a specific package
pnpm --filter @open-edu/cli build
node packages/cli/dist/cli.js dev ./examples/hello-world
```

---

### Task 7: Expand built-in widgets list in widgets/overview.md

**Files:**

- Modify: `apps/docs/docs/widgets/overview.md`

- [ ] **Expand the Built-in Widgets section** to list all 14 widgets

Replace the current single-line bullet with a full table:

```markdown
## Built-in Widgets

| Widget ID                    | Description                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `open-edu.multiple-choice`   | Standard multiple-choice with radio inputs, single correct answer, and score feedback |
| `open-edu.visual-counting`   | Count objects in a visual grid and select the correct number                          |
| `open-edu.matching`          | Drag items from a source list to their matching targets                               |
| `open-edu.drag-drop`         | Drag and drop items into categorized zones                                            |
| `open-edu.sequencing`        | Arrange items in the correct order                                                    |
| `open-edu.fill-blank`        | Type the missing word or phrase in a sentence                                         |
| `open-edu.story-question`    | Read a passage and answer a comprehension question                                    |
| `open-edu.real-world`        | Identify real-world examples of a concept from images or descriptions                 |
| `open-edu.fraction-visual`   | Visual fraction representation — identify fractions from shaded shapes                |
| `open-edu.place-value-chart` | Identify digit place values (ones, tens, hundreds)                                    |
| `open-edu.grid-area`         | Calculate area by counting grid squares                                               |
| `open-edu.chart-reader`      | Read and interpret data from bar charts and graphs                                    |
| `open-edu.clock-time`        | Read analog clock faces and identify the time                                         |
| `open-edu.measurement-scale` | Read measurements from a labeled scale                                                |

All built-in widgets follow the same `WidgetDefinition` contract and accept widget-specific configuration via the `config` field on exercise nodes. For a live demo of every widget, run the [Widget Showcase](../examples/widget-showcase) example package.
```

---

### Task 8: Update sidebars.ts

**Files:**

- Modify: `apps/docs/sidebars.ts`

- [ ] **Add all new sidebar entries**

Updated sidebar:

```typescript
const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    'architecture',
    'learner',
    'package-format',
    'package-authoring',
    {
      type: 'category',
      label: 'CLI',
      items: ['cli/overview'],
    },
    {
      type: 'category',
      label: 'Widgets',
      items: ['widgets/overview'],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/hello-world',
        'examples/intro-javascript',
        'examples/fractions',
        'examples/adaptive-study',
        'examples/autism-reading',
        'examples/living-vs-nonliving',
        'examples/skill-graph',
        'examples/widget-practice',
        'examples/widget-showcase',
        'examples/remote-widget-demo',
      ],
    },
  ],
};
```
