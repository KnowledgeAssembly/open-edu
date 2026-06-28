# UX Recommendations — Open-Edu Learner App

> Based on review of `docs/VISION.md` and a full audit of `apps/learner/src/*`, `packages/runtime/src/layout/*`, `packages/runtime/src/components/*`, and `packages/runtime/src/renderers/*`.

The vision is ambitious: _"A world where educational experiences are as portable, extensible, observable, and accessible as modern software."_  
The implementation today has strong bones but significant UX gaps between that aspiration and what a learner actually experiences. The recommendations below are organized by surface area.

---

## 1. Global Shell & Navigation

### 1.1 Dual Header — Redundant Chrome Eating Vertical Space

**Current state**: In course view, there's a `TopAppBar` _plus_ a separate `LayoutShell` header (the course title + `ProgressBar`). In non-course views, the `TopAppBar` is also present but shows only a flat breadcrumb.

**Problem**: The learner sees two stacked header regions when in a course — the `TopAppBar` (breadcrumb, theme picker, A11y icon, Search, Ask AI, avatar) and immediately below it the LayoutShell's own `<header>` (course title + progress bar). That's 120–130 px of chrome before any content.

**Recommendation**:

- Collapse the two headers into one during course view. The `TopAppBar` should surface the course title and inline `ProgressBar` in its left section when a course is active — removing the LayoutShell's own header entirely.
- In non-course views, the `TopAppBar` is largely wasted space (a single breadcrumb label that already appears in the `LeftNav` active state). Consider replacing it with a **contextual page header inside `<main>`** and removing or slimming the top bar to just the persistent global actions (theme, A11y, avatar).

---

### 1.2 LeftNav — Context Switching is Abrupt

**Current state**: The `LeftNav` shows the same 4 global links (Home, My Progress, Course Catalog, Settings) even when a learner is mid-course. A learner in a course can accidentally navigate away just by clicking Home, with no warning.

**Problem**: The course-in-progress state in the nav is implicit — the active state is just the bordered left pill. Clicking another nav item drops you out of the course silently.

**Recommendations**:

- **Show a course leave warning** (or at minimum a subtle animation) when a learner clicks away from an active course — something like "You're in the middle of a lesson. Are you sure?"
- **Visually distinguish the in-course state more strongly**. When in a course, the 4 global nav items should visually recede (lower opacity or collapse to icons-only), and the course step list should be the hero of the sidebar.
- **Back to catalog should feel safer**: The tiny `Back to catalog` hyperlink text in the upper-right of the in-course sidebar is too easy to accidentally hit. Replace it with a clearly labeled `← Back to Catalog` button at the _bottom_ of the sidebar (after the step list), styled distinctively from the step items.

---

### 1.3 LeftNav Step Indicators — Icons Don't Communicate State Well

**Current state**: Steps use `●` (solid circle) for both current and visited, `○` (empty circle) for future — differentiated only by color class.

**Problem**: Color-only differentiation fails high-contrast and color-blind users. The filled/empty circle distinction is also visually noisy when there are many steps.

**Recommendations**:

- **Use distinct shapes, not just colors**: `✓` checkmark for visited, `▶` or a numbered pill for current, `○` for future.
- **Add a connecting vertical track line** between steps (like a timeline/stepper). This communicates linear progression much more clearly and is a well-established pattern in learning UIs (Duolingo, Coursera sidebars).
- **Truncated step titles**: Currently titles are truncated with CSS `truncate`. Long step names lose meaning. Consider a tooltip on hover.

---

### 1.4 TopAppBar — Overcrowded Right Section

**Current state**: The right side of the TopAppBar contains: A11y toggle, ThemeSelector, Search button, Ask AI button, Avatar — all rendered inline. The ThemeSelector in particular renders as a full dropdown/swatch picker inline in the bar.

**Problem**: 5 controls in 64px of header height creates a crowded, low-affordance bar. Search and Ask AI are wired to `undefined` callbacks (`onSearchClick` / `onAskAiClick` are never passed in `AppShell.tsx`) — these buttons do nothing but occupy space.

**Recommendations**:

- **Remove non-functional controls**: Don't render Search and Ask AI buttons if their callbacks aren't wired up. Currently they silently do nothing, which is a confusing UX anti-pattern.
- **Move theme into Settings**: Theme choice is not a frequent action. Move it exclusively into the `SettingsPage` (it's already there via `ThemeSelector`). Remove the duplicate from the TopAppBar.
- **A11y controls placement**: The A11y dropdown is appropriate in the header for quick access, but the tiny `☸` symbol (♲ recycling icon) is not an intuitive accessibility icon. Use a dedicated accessibility icon (e.g., a person in a circle) with a visible tooltip.

---

## 2. Course Catalog

### 2.1 CourseCard — Information-Poor Layout

**Current state**: Each `CourseCard` shows: title, author, node count, badge count text, `ProgressBadge` (just a `%` number text), and a Start/Continue/Completed button. Everything is left-aligned and unstyled beyond basic spacing.

**Problems**:

- **No visual thumbnail or subject identity** — all cards look identical. At a glance a learner cannot distinguish course content or domain.
- **Badge count is raw text** (e.g., "3 badges available") — this is the currency of the reward system and deserves visual treatment (badge icons, a trophy or star).
- **`ProgressBadge` is not a real visual badge** — it just renders a text percentage. For completed courses it should show a strong "✓ Completed" stamp.
- **Completed courses are disabled** (`disabled={true}`). Learners who want to _revisit_ a completed course have no affordance to do so — this contradicts the VISION's emphasis on mastery-based learning where review is legitimate.
- **`bg-amber-600`** is used for the Continue button — this is a raw Tailwind color not using the design token system, creating visual inconsistency with the rest of the app.

**Recommendations**:

- **Add a subject-color banner** or gradient header to each card, derived from the course title or category — gives each card a distinct visual identity at zero image cost.
- **Replace badge count text with actual badge icons** — even SVG star/badge shapes with counts, colored when earned.
- **Show a proper visual progress bar** on the card (the `ProgressBar` component from runtime already exists — use it here too).
- **For completed courses**: change button label to "Review" (not disabled), to encourage spaced repetition.
- **Use design tokens for button colors** — replace `bg-amber-600` with `bg-tertiary` or `bg-secondary`.

---

### 2.2 Catalog Page — No Filtering, Sorting, or Search

**Current state**: `CatalogPage` is a flat grid of all packages sorted by nothing. There's a `Search` button in the TopAppBar that calls `onSearchClick` (never wired up).

**Problems**: As the catalog grows, learners have no way to find relevant courses. There is no category, difficulty level, or estimated time filter.

**Recommendations**:

- **Add category/tag chips** at the top of the catalog page: filter by subject area or difficulty. This could be driven from `manifest.tags` or similar schema fields.
- **Add basic sort controls**: "Newest," "Most popular," "In progress first."
- **"Continue learning" shelf**: Surface in-progress courses as a highlighted horizontal row at the top of the catalog, above the full grid — this is table stakes for any learning platform.
- **Estimated time to complete**: Display node count as estimated minutes, not raw "N lessons" (e.g., "~20 min" is more meaningful to a learner than "5 lessons").

---

### 2.3 Empty State — Too Plain

**Current state**: An empty catalog shows: `<h1>Courses</h1>` and `<p>No courses found.</p>`.

**Recommendation**: Empty states should be _actionable and warm_. Provide an illustrated empty state with a clear CTA ("Add your first course package" or a guide link). This is especially important given the VISION's goal of onboarding educators to create content.

---

## 3. Course Flow (In-Course)

### 3.1 LayoutShell — Navigation UX Breaks Down for Non-Linear Courses

**Current state**: The `LayoutShell` has a `Back` button and a `Next` button. `Next` advances the node. `Back` goes to the previous _visited_ node. Future nodes are locked (greyed out in the sidebar and inaccessible via buttons).

**Problems**:

- **The Back button is disabled** on the first node but still rendered — it takes up space and creates visual noise.
- **"Submit your answer above to continue"** is displayed as a plain text span in the footer — this is critical instruction for quiz/reflection nodes but is visually invisible, easily missed by learners.
- The footer places both the step count (`N / M`) and the nav buttons in the same row but with no visual grouping — the step counter floats right of the primary actions with no context.

**Recommendations**:

- **Hide (not disable) the Back button on the first step.** Show it only when `canGoBack === true`.
- **Elevate the "submit to continue" instruction**: Replace the grey span with a prominent inline banner or tooltip attached to the Submit button area — use a `⚠` or info icon to draw attention.
- **Move the step count (`N / M`) into the progress bar label** in the header — this removes the duplicate information from the footer and cleans up the action row.
- **The footer action zone**: Left side = Back (if available), Right side = Next/Submit. The current layout puts them both left, leaving a dead right half — fix the alignment.

---

### 3.2 Quiz UX — Feedback is Understated

**Current state**: After submitting a quiz answer, a colored `div` appears below the options: "Correct! Well done." (green) or "Incorrect. The correct answer is highlighted." (red).

**Problems**:

- **No animation** — the feedback appears/disappears instantaneously with no motion cue. Learners may miss it.
- **The feedback doesn't tell you _why_ the correct answer is correct** — there's no `explanation` field rendered anywhere.
- **The fieldset is simply `disabled` after submission** — this is correct semantically but the options visually "grey out" in a harsh way. Learners can no longer clearly read the correct answer text.
- **Only binary scoring (0 or 100)** is communicated in the UI — even if partial credit exists in the schema, it's not surfaced.
- **No retry affordance** — if a learner gets it wrong, they cannot try again (unless the workflow routes them back).

**Recommendations**:

- **Add an entrance animation** (fade + slide) to the feedback message.
- **Render an explanation field** below feedback if the `QuizNode` schema supports it (even as optional). "The correct answer is X because..." is foundational for learning.
- **Keep correct answer text readable** after submission — change highlight to an outlined border + checkmark icon rather than relying on disabled greying.
- **Provide a "Try again" button** for wrong answers (at least as an opt-in reset, without counting toward workflow progression).

---

### 3.3 Reflection Renderer — Lacks Engagement

**Current state**: A `<textarea>` with a `Submit` button. After submit, shows "Saved — thank you for your reflection."

**Problems**:

- **There is no context or scaffolding** to guide the reflection. A raw textarea with only a prompt is the minimum viable implementation.
- **Character count from 0 to 4096 is displayed as `0 / 4096`** — a cold, clinical counter that discourages learners.
- **No "save draft" or autosave** — if a learner navigates away accidentally, their writing is lost.

**Recommendations**:

- **Add guiding bullet points or sentence starters** below the prompt (e.g., "Consider: What surprised you? What would you do differently?"). These should be driven by optional fields in the `ReflectionNode` schema.
- **Replace raw char counter with a word count** (e.g., "23 words" feels warmer and more natural for reflections).
- **Autosave to `localStorage`** keyed to `nodeId` so accidental navigation doesn't lose content.

---

### 3.4 Node Transitions — No Animation Between Steps

**Current state**: Switching nodes via the workflow engine is an immediate DOM swap. The `NodeRenderer` does not animate between node content areas.

**Problem**: Without a transition, learners get no visual feedback that "something changed." This is especially jarring for lesson → quiz transitions.

**Recommendation**: Add a subtle **fade + upward slide** transition when `currentNodeId` changes, using either CSS transitions on the content area or a simple React state toggle. Even 150ms of animation communicates meaningful state change.

---

## 4. Widget Experience

### 4.1 Widget Loading State — Plain Text Only

**Current state**: While a remote widget loads, the UI renders a `<div role="status">Loading remote widget "X"…</div>` — raw text.

**Recommendation**: Replace with a proper **skeleton loader** — a shimmed placeholder card matching the widget's approximate dimensions. This prevents layout shift and gives the page a polished feel.

---

### 4.2 Widget Error State — Alarming

**Current state**: Widget errors render `<div role="alert">Widget "X" encountered an error.</div>` — a bare string.

**Problem**: Bare error text with no guidance is alarming for learners and useless for educators.

**Recommendations**:

- **Friendly error card**: "This activity couldn't load. Try refreshing the page." with a Retry button that re-triggers the widget mount.
- **For remote widget failures with a fallback**: The fallback widget is silently used — consider showing a small informational banner: "Loading alternative activity…"

---

### 4.3 Widget Boundary / Canvas — No Defined Area

**Current state**: Widgets render inside `WidgetRenderer` with no consistent wrapper. Each widget manages its own sizing and layout. In the `NodeRenderer`, widgets are wrapped in a `FocusTrap` but have no defined height or background container.

**Problem**: Widgets appear "floating" inside the lesson shell with no visual delineation. A coding widget vs a math visualization widget will look fundamentally different, creating an inconsistent experience.

**Recommendation**: Define a **`WidgetCanvas`** wrapper component that gives every widget a consistent outer shell: a rounded card with a subtle border, a minimum height, a title bar showing the widget type/name, and the FocusTrap inside. This enforces visual consistency regardless of widget content.

---

## 5. Completion & Progress

### 5.1 CompletionScreen — Anticlimactic

**Current state**: A centered div: `"You finished {title}!"`, a skills summary, badge list, and `"Back to catalog"` button.

**Problems**:

- **No celebration moment**. Finishing a course is a significant learning milestone. A plain centered text and a button is entirely unmemorable.
- **Badge names are plain text** in `<li>` items — no visual badge representation.
- **Only one CTA** ("Back to catalog") — no options to share, download certificate, or view what to learn next.

**Recommendations**:

- **Celebrate completion**: Add a confetti burst animation (CSS or a lightweight library) triggered on mount.
- **Show earned badges visually** — proper badge card components with icons, not just text list items.
- **"What's next?" recommendation**: Surface 1–2 catalog courses related to topics just completed (even a simple "You might also like" section from the same catalog).
- **Progress summary stats**: "You completed X steps, answered Y quizzes, wrote Z reflections in N minutes." This closes the loop on the VISION's learning observability principle.

---

### 5.2 Progress Dashboard — Functional but Cold

**Current state**: A list of progress cards showing course title, step count, "Last: [node title]", badge count, progress bar, and a % number + Continue button.

**Problems**:

- **"Last: [node title]"** is raw node path text (e.g., `"Last: 01-intro.md"`). Node filenames are implementation details, not learner-facing labels.
- **No timeline or date information** — learners have no way to see when they last worked on a course.
- **Zero visual hierarchy** — all courses in the list look the same weight regardless of completion status or last-accessed recency.
- **No "start something new" prompt** if all courses are completed or none are in progress.

**Recommendations**:

- **Fix "Last:" label** — resolve the node title from the `loadedPackage.nodes` array (the code does attempt this for some cases but falls back to the raw ID). Always show a human title.
- **Add "Last studied" relative timestamp** (e.g., "2 days ago") — requires persisting a timestamp alongside `ProgressSnapshot`.
- **Sort by recency** — most recently accessed course surfaces first.
- **Visual completion state**: Completed courses get a distinct "Completed ✓" visual treatment (green border, muted state), In-progress courses are the primary focus.

---

## 6. Settings Page

### 6.1 Settings Are Not Persisted

**Current state**: Font size, reduced motion, and high contrast are stored only in component `useState` — they reset on every page reload. Theme is the only setting persisted (via `useThemePreference`).

**Problem**: An accessibility preference that evaporates on refresh is not accessible design. This directly contradicts the VISION's "Accessibility is a responsibility of the runtime" principle.

**Recommendation**: Persist all accessibility preferences to `localStorage` (or the same persistence layer used by `useThemePreference`). Load saved values as initial state on mount.

---

### 6.2 Font Size Slider

**Current state**: Font size is controlled by two A- / A+ buttons stepping ±10%.

**Recommendation**: Offer a **range slider** (`<input type="range">`) as the primary control, with A-/A+ as quick-tap alternatives. A slider gives users more precise control and is a more conventional accessibility control pattern.

---

## 7. Information Architecture — Summary

| Area                        | Current State                             | Priority  |
| --------------------------- | ----------------------------------------- | --------- |
| Dual-header chrome          | Two stacked header regions in course view | 🔴 High   |
| Course navigation safety    | Silent loss of course progress            | 🔴 High   |
| CourseCard visual identity  | All cards look identical                  | 🔴 High   |
| Quiz feedback & explanation | Understated, no explanation text          | 🔴 High   |
| Settings not persisted      | Accessibility prefs lost on reload        | 🔴 High   |
| Step indicator icons        | Color-only differentiation                | 🟡 Medium |
| Node transition animation   | Abrupt content swaps                      | 🟡 Medium |
| Widget loading/error states | Plain text, no skeleton                   | 🟡 Medium |
| Completion celebration      | No ceremony for achievement               | 🟡 Medium |
| Reflection scaffolding      | Raw textarea, no guiding text             | 🟡 Medium |
| Catalog filtering/search    | No filter or sort                         | 🟡 Medium |
| TopAppBar control clutter   | Non-wired buttons render silently         | 🟡 Medium |
| Progress dashboard recency  | No timestamps, raw node IDs               | 🟢 Low    |
| Widget canvas consistency   | No defined visual boundary                | 🟢 Low    |
| Empty state design          | Plain "No courses found"                  | 🟢 Low    |

---

## Alignment with VISION Principles

| VISION Principle            | UX Gap                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Content First**           | Course cards give no sense of content identity (no thumbnail, category, or subject color)                |
| **Accessibility by Design** | Settings are not persisted; color-only step states fail WCAG 1.4.1; A11y icon uses wrong symbol          |
| **Learning Observability**  | Completion screen doesn't surface the learner's own session analytics even though telemetry is collected |
| **Adaptive Learning**       | No remediation path visible in quiz UX; "try again" is not offered                                       |
| **Decoupled Incentives**    | Badge system exists but is represented as plain text throughout; no visual reward experience             |
| **Open Extensibility**      | Widgets have no consistent visual container — each widget owns its own shell inconsistently              |
