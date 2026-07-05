# Widget Backlog

Version: 0.1.0
Status: Draft

---

## Overview

This document tracks the backlog for porting the 14 activity types from learn-easy into open-edu as built-in widgets. Each widget follows the established `WidgetDefinition` pattern and owns its content schema, scoring logic, and rendering.

## Widget Architecture Pattern

```
packages/widgets/src/builtins/
├── <WidgetName>/
│   ├── <WidgetName>.tsx          # component + config schema + scoring
│   └── <WidgetName>.test.tsx     # unit tests
```

Every widget:

- Exports a `WidgetDefinition` with id `open-edu.<widget-name>`
- Defines its own Zod config schema (co-located, not in `@open-edu/schemas`)
- Validates `props.config` at render time
- Calls `props.complete(score)` and `props.emitInteraction(data)`
- Is keyboard-accessible (Tab, Enter, Space, Arrow keys)
- Passes axe-core automated checks
- Has Vitest unit tests covering rendering, scoring, accessibility

## Epics

---

### Epic W1: Foundation Patterns (3 widgets)

Priority: P0 — Unblocks all other widgets and validates the architecture.

**Widgets:**

| #   | Widget          | Widget ID                  | learn-easy type   | Steps used                               |
| --- | --------------- | -------------------------- | ----------------- | ---------------------------------------- |
| 1   | Visual Counting | `open-edu.visual-counting` | `visual_counting` | observe, guided, independent, completion |
| 2   | Multiple Choice | `open-edu.multiple-choice` | `multiple_choice` | mastery_check                            |
| 3   | Matching        | `open-edu.matching`        | `matching`        | guided, independent                      |

**Stories:**

- **W1.1 — Visual Counting Widget**
  - Config schema: `description`, `items[]`, `count`, `text`, `hint`, `hints[]`, `left`, `right`, `sum` (addition variant)
  - Render: displays emoji items in a row, count label, optional hint
  - Scoring: `correct` when learner clicks the matching count; observe steps auto-complete
  - Keyboard: items as buttons, Enter/Space to select count
  - A11y: items have aria-labels, count announced via live region
  - Edge cases: empty items array, addition mode (`left`/`right` instead of `items`/`count`), graduated hints

- **W1.2 — Multiple Choice Widget (extend existing)**
  - Config schema: `questions[]` with `question`, `options[]`, `correctIndex`
  - Render: question text, radio group, submit button, result feedback, multi-question mode
  - Scoring: per-question correct/incorrect, aggregate score for multi-question
  - Keyboard: radio group navigation with Arrow keys, Tab between questions
  - A11y: fieldset/legend for each question group, aria-live for results
  - Edge cases: single question, multi-question pagination, no options

- **W1.3 — Matching Widget**
  - Config schema: `description`, `pairs[]` (`itemA`, `itemB`), `hints[]`
  - Render: two columns (A items shuffled, B items), drag or click to pair
  - Scoring: all pairs correct for `correct: true`
  - Keyboard: Tab between A items, Enter to select, Tab to B items, Enter to match
  - A11y: drop zones announced, match confirmations in live region
  - Edge cases: empty pairs, single pair, mismatched pair counts

---

### Epic W2: Interaction Primitives (3 widgets)

Priority: P1 — Adds drag, order, and fill patterns used across many chapters.

**Widgets:**

| #   | Widget            | Widget ID             | learn-easy type | Steps used                   |
| --- | ----------------- | --------------------- | --------------- | ---------------------------- |
| 4   | Drag & Drop       | `open-edu.drag-drop`  | `drag_drop`     | guided, independent          |
| 5   | Sequencing        | `open-edu.sequencing` | `sequencing`    | guided, independent          |
| 6   | Fill in the Blank | `open-edu.fill-blank` | `fill_blank`    | guided, independent, mastery |

**Stories:**

- **W2.1 — Drag & Drop Widget**
  - Config schema: `description`, `groups[]` (`label`, `target[]`), `items[]`
  - Render: source items pool, target group zones, drag ghost
  - Scoring: all items in correct groups for `correct: true`
  - Keyboard: Tab to item, Enter to pick up, Tab to zone, Enter to drop
  - A11y: live announcements for pickup/drop, group labels as landmarks
  - Edge cases: empty items, single group, items left in source

- **W2.2 — Sequencing Widget**
  - Config schema: `description`, `items[]` (correct order), `shuffled[]` (optional display order)
  - Render: sortable list of items, up/down controls
  - Scoring: all items in correct position for `correct: true`
  - Keyboard: Arrow keys to reorder, Tab to navigate items
  - A11y: position announcements ("item 2 of 5"), reorder confirmations
  - Edge cases: empty items, single item, no shuffled provided

- **W2.3 — Fill in the Blank Widget**
  - Config schema: `template` (with `___` placeholders), `blanks[]` (`id`, `position`, `correctAnswer`, `options[]`), `mode` (`select` | `type`), `prompt`, `statement`, `answers[]` (pipeline variant)
  - Render: template text with inline inputs/dropdowns at blank positions
  - Scoring: all blanks correct for `correct: true` (exact string match)
  - Keyboard: Tab between blanks, Enter to open dropdown, Arrow keys in dropdown
  - A11y: each blank labelled by position, errors announced
  - Edge cases: single blank, `type` mode (keyboard input), pipeline variant (`answers[]` → `blanks[]`)

---

### Epic W3: Narrative & Real-World (2 widgets)

Priority: P1 — Reading comprehension and generalization activities.

**Widgets:**

| #   | Widget         | Widget ID                 | learn-easy type  | Steps used                   |
| --- | -------------- | ------------------------- | ---------------- | ---------------------------- |
| 7   | Story Question | `open-edu.story-question` | `story_question` | guided, independent, mastery |
| 8   | Real World     | `open-edu.real-world`     | `real_world`     | independent                  |

**Stories:**

- **W3.1 — Story Question Widget**
  - Config schema: `story` (text), `questions[]` (`question`, `options[]`, `correctIndex`)
  - Render: story text block (scrollable if long), questions below
  - Scoring: per-question correct/incorrect, aggregate
  - Keyboard: Tab through story, radio groups per question
  - A11y: story in semantic `<article>`, questions in `<fieldset>`
  - Edge cases: single question, long story text, multi-paragraph story

- **W3.2 — Real World Widget**
  - Config schema: `description`, `scenario`, `prompt`, `expectedAnswer` (optional)
  - Render: scenario description, open-ended text input, submit
  - Scoring: `expectedAnswer` comparison (fuzzy match) if provided, else `correct: true` on submit
  - Keyboard: Tab to textarea, Enter to submit
  - A11y: textarea with character count, submit confirmation
  - Edge cases: no expectedAnswer (free-form), very long expected answer

---

### Epic W4: Math Visualizations (4 widgets)

Priority: P1 — Level B math visualizers. Each a standalone visual/interactive widget.

**Widgets:**

| #   | Widget            | Widget ID                    | learn-easy type     | Steps used                            |
| --- | ----------------- | ---------------------------- | ------------------- | ------------------------------------- |
| 9   | Fraction Visual   | `open-edu.fraction-visual`   | `fraction_visual`   | observe, guided, independent          |
| 10  | Place Value Chart | `open-edu.place-value-chart` | `place_value_chart` | observe, guided, independent, mastery |
| 11  | Grid Area         | `open-edu.grid-area`         | `grid_area`         | observe, guided, independent, mastery |
| 12  | Chart Reader      | `open-edu.chart-reader`      | `chart_reader`      | observe, guided, independent, mastery |

**Stories:**

- **W4.1 — Fraction Visual Widget**
  - Config schema: `numerator`, `denominator`, `mode` (`bar` | `circle`), `label`, `showLabel`, `interactive`, `compare` (optional `numerator`, `denominator`)
  - Render: SVG bar or circle divided into equal parts, highlighted numerator portion, optional comparison fraction side-by-side
  - Scoring: observe auto-completes; interactive mode: correct when learner selects matching fraction
  - Keyboard: Arrow keys to adjust numerator/denominator in interactive mode
  - A11y: SVG with aria labels per segment, fraction value in live region
  - Edge cases: denominator = 0 (invalid), compare mode layout, non-interactive observe

- **W4.2 — Place Value Chart Widget**
  - Config schema: `maxPlaces` (`lakh` | `crore`), `digits[]` (null = empty), `targetNumber`, `interactive`, `draggableDigits[]`, `showLabels`, pipeline shapes (A, B, C)
  - Render: place value columns with labels, digit slots, draggable digit tokens
  - Scoring: observe auto-completes; interactive: exact digit-to-place match against `targetNumber`
  - Keyboard: Tab to digit token, Arrow keys to move between slots, Enter to place
  - A11y: column headers as landmarks, digit placement announced
  - Edge cases: pipeline shapes (chart object, digit/place pairs, columns/rows), lakh vs crore

- **W4.3 — Grid Area Widget**
  - Config schema: `rows`, `cols`, `mode` (`area` | `perimeter`), `highlighted[]` ({`row`, `col`}), `interactive`, `maxHighlights`, `cellSize`, `showCount`
  - Render: CSS grid of cells, clickable to toggle highlight, running count
  - Scoring: observe auto-completes; interactive: exact count (area) or perimeter match
  - Keyboard: Arrow keys to navigate grid cells, Space to toggle highlight
  - A11y: grid role, cell row/col announced, running count in live region
  - Edge cases: pre-highlighted cells, maxHighlights limit, area vs perimeter counting

- **W4.4 — Chart Reader Widget**
  - Config schema: `type` (`bar` | `pictograph`), `data[]` (`label`, `value`, `emoji`?), `title`, `showValues`, `interactive`, `correctLabel`
  - Render: bar chart (SVG) or pictograph (emoji grid), title, axis labels
  - Scoring: observe auto-completes; interactive: correct when bar/label clicked matches `correctLabel`
  - Keyboard: Tab between bars, Enter to select, Arrow keys to move between bars
  - A11y: chart role, bar labels and values in aria-labels, selection announced
  - Edge cases: pictograph mode (emoji tiles), empty data, single bar

---

### Epic W5: Measurement Instruments (2 widgets)

Priority: P2 — Analog measurement reading and setting.

**Widgets:**

| #   | Widget            | Widget ID                    | learn-easy type     | Steps used                            |
| --- | ----------------- | ---------------------------- | ------------------- | ------------------------------------- |
| 13  | Clock Time        | `open-edu.clock-time`        | `clock_time`        | observe, guided, independent, mastery |
| 14  | Measurement Scale | `open-edu.measurement-scale` | `measurement_scale` | observe, guided, independent, mastery |

**Stories:**

- **W5.1 — Clock Time Widget**
  - Config schema: `hour`, `minute`, `mode` (`read` | `set`), `showDigital`, `targetTime` (`hour`, `minute`), `interactive`, `size`
  - Render: SVG analog clock face, hour/minute hands, optional digital display
  - Scoring: observe auto-completes; `read` mode: correct when clicks matching hour marker; `set` mode: hour exact, minutes within ±5 of `targetTime`
  - Keyboard: Arrow keys to move hands in `set` mode, Tab to switch hour/minute
  - A11y: time announced in live region, clock hands with aria labels
  - Edge cases: 12-hour wrap, minute hand at 0, midnight/noon

- **W5.2 — Measurement Scale Widget**
  - Config schema: `type` (`ruler` | `thermometer` | `cylinder`), `min`, `max`, `step`, `unit`, `value`, `interactive`, `showReading`, `showLabels`, `targetValue`
  - Render: SVG scale appropriate to type (ruler marks, thermometer column, cylinder graduations), marker at `value`, interactive draggable marker
  - Scoring: observe auto-completes; interactive: ±1 step tolerance from `targetValue`
  - Keyboard: Arrow Left/Right or Up/Down to move marker by step
  - A11y: current reading in live region, scale markings with labels
  - Edge cases: thermometer negative values, cylinder meniscus reading, unit display

---

### Epic W6: Integration & Examples

Priority: P2 — Ties widgets into the runtime and creates demo packages.

**Stories:**

- **W6.1 — Widget Registry Bootstrap**
  - Create `createDefaultRegistry()` that registers all 14 built-in widgets
  - Export from `@open-edu/widgets` as convenience
  - Tests ensure all widgets register without collision

- **W6.2 — Activity Sequence Example Package**
  - Create `examples/activity-showcase/` with one package exercising all 14 widgets
  - Each widget gets at minimum an observe and an interactive node
  - Accessible keyboard path through entire package

- **W6.3 — Scoring Integration Tests**
  - Vitest tests for each widget's scoring logic with edge cases
  - Verify `complete(score)` calls with correct values for:
    - Observe auto-complete (`correct: true`, `observed: true`)
    - Correct answers (`score: 100`)
    - Incorrect answers (`score: 0`)
    - Partial credit where applicable (multi-question)
  - Follow learn-easy's `evaluateActivity()` scoring rules

- **W6.4 — Accessibility Audit**
  - axe-core scans on every widget in all states (idle, answered, error)
  - Keyboard navigation test: complete each widget using only keyboard
  - Screen reader announcements verified for state changes
  - Focus trap integration with the accessibility engine

- **W6.5 — Telemetry Integration**
  - Each widget emits structured interaction events via `emitInteraction`
  - Event schema: `{ type, widgetId, step, action, score, timestamp }`
  - Verify events land in JSONL telemetry stream

---

## Summary Matrix

| Epic                         | Widgets | Stories | Priority | Dependencies |
| ---------------------------- | ------- | ------- | -------- | ------------ |
| W1 — Foundation Patterns     | 3       | 3       | P0       | None         |
| W2 — Interaction Primitives  | 3       | 3       | P1       | W1           |
| W3 — Narrative & Real-World  | 2       | 2       | P1       | W1           |
| W4 — Math Visualizations     | 4       | 4       | P1       | W1           |
| W5 — Measurement Instruments | 2       | 2       | P2       | W1           |
| W6 — Integration & Examples  | —       | 5       | P2       | W1–W5        |

**Total: 14 widgets, 19 stories**

---

## Widget ID Convention

All widgets use the `open-edu.` prefix with kebab-case names matching the learn-easy type:

| learn-easy type     | Widget ID                    |
| ------------------- | ---------------------------- |
| `visual_counting`   | `open-edu.visual-counting`   |
| `multiple_choice`   | `open-edu.multiple-choice`   |
| `matching`          | `open-edu.matching`          |
| `drag_drop`         | `open-edu.drag-drop`         |
| `sequencing`        | `open-edu.sequencing`        |
| `fill_blank`        | `open-edu.fill-blank`        |
| `story_question`    | `open-edu.story-question`    |
| `real_world`        | `open-edu.real-world`        |
| `fraction_visual`   | `open-edu.fraction-visual`   |
| `place_value_chart` | `open-edu.place-value-chart` |
| `grid_area`         | `open-edu.grid-area`         |
| `chart_reader`      | `open-edu.chart-reader`      |
| `clock_time`        | `open-edu.clock-time`        |
| `measurement_scale` | `open-edu.measurement-scale` |

---

## Acceptance Criteria (per widget)

- [ ] Zod config schema defined and exported
- [ ] Widget renders correctly for all states (idle, answered, correct, incorrect)
- [ ] `complete(score)` called with correct score value
- [ ] `emitInteraction()` called with structured event data
- [ ] Fully keyboard navigable (no mouse required)
- [ ] Passes axe-core automated accessibility check
- [ ] Observe step auto-completes after 1500ms (where applicable)
- [ ] Graduated hints supported (where applicable)
- [ ] Vitest unit tests cover: rendering, scoring, edge cases, keyboard, a11y
- [ ] Widget registered in `builtins/index.ts` and re-exported from package
