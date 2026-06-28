# UX Enhancements & Built-in Widgets Polish Implementation Plan

This implementation plan details the epics and stories required to resolve the UX gaps identified in the Learner App shell, navigation, pages, and all 14 built-in widgets in the `@open-edu/widgets` package.

---

## User Review Required

> [!IMPORTANT]
>
> - **Tailwind Integration**: All UI updates in runtime components or widgets must follow the Tailwind tokens system referencing `--oe-*` CSS variables, rather than hardcoded colors (like `bg-amber-600` or `#ef4444`).
> - **Dev-Server tailwind.css Compilation**: Any change to Tailwind classes used in runtime packages requires running:
>   `pnpm --filter @open-edu/dev-server exec tailwindcss -c tailwind.config.js -i src/index.css -o src/tailwind.css`
>   to avoid unstyled content in the dev server.
> - **A11y (axe-core) Audits**: Every story requires updating or creating unit tests (`vitest` with `axe-core` checks) and validating E2E behavior using Playwright.

---

## Proposed Changes

We group the required changes into **four (4) distinct epics** that target the layers of the monorepo logically:

1. **Epic 25: Global Shell & Navigation UX Improvements** (Reduces vertical height, fixes navigation safety, and cleans up header layout)
2. **Epic 26: Course Catalog & Dashboard Polish** (Adds visual richness to catalog cards, category filtering/sorting, and relative time/mastery treatment)
3. **Epic 27: Widget SDK Enhancements & Core Canvas** (Builds the `WidgetCanvas` wrapper component, standardizes buttons, observe mode timer overlays, and error boundaries)
4. **Epic 28: Built-in Widgets Quality and Interactive Polish** (Addresses individual UX problems across all 14 widgets)

---

### Epic 25: Global Shell & Navigation UX Improvements

This epic cleans up the layout of the app header and sidebar, preventing redundant vertical spacing and introducing navigation safety checks.

#### [MODIFY] [LayoutShell.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/layout/LayoutShell.tsx)

#### [MODIFY] [TopAppBar.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/layout/TopAppBar.tsx)

#### [MODIFY] [LeftNav.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/layout/LeftNav.tsx)

#### Stories:

- **Story 25.1: Collapse Dual Header in Course View**
  - _Description_: Collapse the redundant `TopAppBar` and `LayoutShell` header. When a course is active, hide the `LayoutShell` header and instead render the course title and inline `ProgressBar` inside the `TopAppBar`'s left/center section.
  - _Acceptance Criteria_: Vertical chrome is reduced in course view. Non-course pages slim down the `TopAppBar` or use contextual headers inside `<main>`.
- **Story 25.2: Safe Course Exit Guard & Navigation Safety**
  - _Description_: Distinguish the sidebar state when mid-course (dimming or collapsing the general links). Warn learners with a confirmation dialog/modal if they attempt to navigate away from an active course by clicking Home, Catalog, or Settings. Move and style the `← Back to Catalog` button to the bottom of the course sidebar below the step list.
  - _Acceptance Criteria_: Safe guards are in place. Confirmation dialogue shows. Exit triggers reset properly.
- **Story 25.3: Stepper Enhancements & High-Contrast Progress Indicators**
  - _Description_: Replace color-only progress dots with shapes (`✓` checkmark for completed, `▶` or numbered pill for active, `○` for future) and add a connecting vertical track line. Add hover tooltips for truncated step titles.
  - _Acceptance Criteria_: Elements pass WCAG 1.4.1. Track line aligns vertically. Tooltips behave correctly.
- **Story 25.4: TopAppBar Action Cleanup & A11y Icon Refactor**
  - _Description_: Remove non-functional "Search" and "Ask AI" buttons. Relocate the theme selector exclusively to the Settings page. Replace the `☸` accessibility symbol with a standard accessibility icon (e.g., person-in-circle) + hover tooltip.
  - _Acceptance Criteria_: Header is uncluttered. Accessibility icon is standard.

---

### Epic 26: Course Catalog & Dashboard Polish

Transforms the catalog and dashboards from flat, raw-text grids to highly visual, filterable, and mastery-oriented dashboards.

#### [MODIFY] [CatalogPage.tsx](file:///Users/sarthakpatnaik/Code/open-edu/apps/learner/src/pages/CatalogPage.tsx)

#### [MODIFY] [CourseCard.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/layout/CourseCard.tsx)

#### [MODIFY] [ProgressDashboard.tsx](file:///Users/sarthakpatnaik/Code/open-edu/apps/learner/src/pages/ProgressDashboard.tsx)

#### [MODIFY] [CompletionScreen.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/layout/CompletionScreen.tsx)

#### Stories:

- **Story 26.1: CourseCard Visual Identity & Progress Refactor**
  - _Description_: Generate color/gradient banners dynamically based on course category/title. Replace raw text badge count with visual badge/trophy icons. Render the visual `ProgressBar` component inside `CourseCard`.
  - _Acceptance Criteria_: Visual cards look distinct. Progress bar updates accurately.
- **Story 26.2: Mastery Review Mode & Dynamic Filtering**
  - _Description_: Allow learners to click "Review" (instead of disabling the button) on completed courses to revisit content. Add tags/chips at the top of the catalog page to filter by subject area or difficulty, and add sort controls. Introduce a "Continue learning" shelf on top of the catalog for in-progress courses.
  - _Acceptance Criteria_: Review mode is functional. Catalog filtering and sorting behaves dynamically.
- **Story 26.3: Completion Screen Celebration & Observability Stats**
  - _Description_: Add a lightweight confetti animation on completion mount. Render earned badges visually. Surface completion stats (total steps, quiz accuracy, time spent) and provide a "What's next?" course recommendation deck.
  - _Acceptance Criteria_: Completion shows celebratory animations. Stats match telemetry summary.
- **Story 26.4: Progress Dashboard Humanization & Sorting**
  - _Description_: Resolve node IDs to human-readable titles. Persist and display "Last studied" relative timestamps. Sort dashboards by recency. Render a distinct completion state checkmark banner for finished courses.
  - _Acceptance Criteria_: No raw filenames appear in progress cards. Timestamp format updates dynamically.

---

### Epic 27: Widget SDK Enhancements & Core Canvas

Standardizes the container, error states, and buttons across all widgets, ensuring consistency, accessibility, and clean telemetry hooks.

#### [NEW] [WidgetCanvas.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/components/WidgetCanvas.tsx)

#### [MODIFY] [WidgetRenderer.tsx](file:///Users/sarthakpatnaik/Code/open-edu/packages/runtime/src/renderers/WidgetRenderer.tsx)

#### [MODIFY] [widget-sdk.ts] or [types.ts](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/types.ts)

#### Stories:

- **Story 27.1: WidgetCanvas Container wrapper**
  - _Description_: Implement a global `WidgetCanvas` wrapping element. It should wrap each widget in a card with a header containing the widget's title/type, standard padding, a subtle border, and integrate the `FocusTrap`.
  - _Acceptance Criteria_: Uniform layout for all widgets. Focus management wraps nicely.
- **Story 27.2: Standardize Button Tokens & Global Styling**
  - _Description_: Refactor all native button styles in widgets to inherit classes from the theme tokens system. Provide utility exports or inject themed components into the widget context.
  - _Acceptance Criteria_: Buttons fit the color palette. No unstyled browser elements remain.
- **Story 27.3: Seen/Observe Mode Refactor**
  - _Description_: Replace the silent 1.5s auto-completion with a visible "Seen ✓" progress overlay or an explicit "Mark as seen" interactive button.
  - _Acceptance Criteria_: Active learner acknowledgment is captured. Telemetry updates on seen.
- **Story 27.4: Error Boundaries and Graceful Retries**
  - _Description_: Distinguish between learner-facing friendly cards (with "Retry Activity" CTAs) and dev-mode configuration validation error warnings.
  - _Acceptance Criteria_: Runtime errors do not lock the screen or expose stack traces to the learner.

---

### Epic 28: Built-in Widgets Quality and Interactive Polish

Applies individual fixes to improve the interaction design, accessibility, and content quality for all 14 built-in widgets.

#### [MODIFY] all files in [builtins/](file:///Users/sarthakpatnaik/Code/open-edu/packages/widgets/src/builtins)

#### Stories:

- **Story 28.1: MultipleChoice & StoryQuestion Refactor**
  - _Description_: Unify MultipleChoice modes. Enable per-question immediate feedback (correct/incorrect review) prior to clicking Next. Show an explanation field on submission. Keep correct options readable after submission using custom highlight frames instead of hard disabling. Give StoryQuestion a callout backdrop block.
  - _Acceptance Criteria_: Users can review mistakes. Screen readers read quiz elements correctly.
- **Story 28.2: DragDrop, Matching, and Sequencing Interactive Mechanics**
  - _Description_: Add drag-to-reorder for Sequencing and display numbered slots. Replace Matching ASCII lines with SVG connector lines and support instant re-selection. Convert DragDrop click-to-place border behavior to highlight only relevant drop zones and resolve the red remove button issue.
  - _Acceptance Criteria_: Interactions are fluid. Layout handles multiline options cleanly.
- **Story 28.3: A11y Hardening (GridArea & ClockTime)**
  - _Description_: Remove `outline: none` on GridArea cells and implement custom focus rings. Remove the Tab key trap in ClockTime; add explicit "Hour" and "Minute" adjustment buttons instead.
  - _Acceptance Criteria_: Pass axe-core checks. Keyboard navigation succeeds.
- **Story 28.4: VisualCounting & FractionVisual Layout fixes**
  - _Description_: Refactor fraction bar rendering to use dynamic rectangles instead of squares, add hover fill states, and format mathematical notation (`n/d`) cleanly. Fix visual counting button ranges and wrap items in a flex grid to prevent wrapping overflows on mobile devices.
  - _Acceptance Criteria_: Math typography looks clean. SVGs scale responsively.
- **Story 28.5: MeasurementScale, PlaceValueChart, and RealWorld refinement**
  - _Description_: Fix placeholder duplicates and implement self-assessed scoring verification in RealWorld. Implement mobile touch-drags (`onTouchStart`, `onTouchMove`) for MeasurementScale and replace the default red liquid fill color with themed color. Fix the PlaceValueChart slot replace logic bug and refine the column abbreviations.
  - _Acceptance Criteria_: Dragging works on mobile. PlaceValueChart digits replace correctly.

---

## Verification Plan

### Automated Tests

- Run all unit and integration tests across affected workspaces:
  ```bash
  pnpm test
  pnpm lint
  pnpm typecheck
  pnpm test:e2e
  ```
- Specific tests for runtime and widgets packages:
  ```bash
  pnpm --filter @open-edu/widgets test
  pnpm --filter @open-edu/runtime test
  ```

### Manual Verification

- Launch the dev-server and inspect UI elements under diverse layouts:
  ```bash
  pnpm --filter @open-edu/dev-server dev
  ```
- Run the learner app locally to verify theme integration and page routing:
  ```bash
  pnpm --filter @open-edu/learner dev
  ```
