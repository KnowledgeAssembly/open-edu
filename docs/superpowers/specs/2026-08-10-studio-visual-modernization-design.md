# Studio Visual Modernization — Design Spec

**Date:** 2026-08-10  
**Status:** Draft for review  
**Scope:** `apps/dev-server` Creator Studio look & feel (shell, Home, Outline, editors, Preview, Share, Developer mode chrome)  
**Parent product spec:** [`2026-08-05-course-creator-studio-design.md`](./2026-08-05-course-creator-studio-design.md)  
**Wireframes:** [`course-creator-studio/wireframes/`](./course-creator-studio/wireframes/)  
**Implementation plan:** [`../plans/2026-08-10-studio-visual-modernization.md`](../plans/2026-08-10-studio-visual-modernization.md)

---

## 1. Summary

Course Creator Studio’s **information architecture is sound** (Home → Outline → Edit → Preview → Share), and most Phase 0–4 capabilities exist. The **visual and interaction craft does not yet read as a modern authoring product**. Creator mode still looks like a flat shadcn form shell; Developer mode still shows prototype floating FABs.

This track modernizes **look & feel and interaction polish** without changing the on-disk package model, StudioAPI contract, or Creator/Developer progressive-disclosure strategy.

**North-star outcome:** A teacher opening Studio recognizes a branded product in under 3 seconds, understands where they are in the create → share loop, and never feels they have dropped into a generic admin CRUD app or an IDE — unless they explicitly switch to Developer mode.

---

## 2. Problem statement

### 2.1 Current symptoms

| Symptom                           | Evidence in code                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Weak brand chrome                 | `StudioTopBar` is plain text + muted subtitle; no `OpenEduLogo`, no active nav, no breadcrumbs           |
| Form-factory pages                | Every Creator view is `max-w-* space-y-* p-6` + bordered cards/lists at uniform density                  |
| Unused Visual DNA                 | Studio imports primitives only; ignores `TopAppBar`, `AppLayout`, `PageHeader`, `SideNav`, `OpenEduLogo` |
| Outline as tool table             | Per-row ↑ ↓ Edit trash; three equal Add buttons; no drag; Advanced as native `<details>`                 |
| Lesson editor feels like IDE      | Mono `Textarea` Markdown; no coaching rail; no mini preview                                              |
| Home does many jobs               | Continue + templates + AI + recent stacked on one scroll                                                 |
| Developer chrome feels unfinished | Fixed green “Edit Package” / destructive Reset cluster over content (`DevApp`)                           |
| Wireframe ↔ ship gap              | Warm branded wireframes exist; shipped UI never adopted their hierarchy or coaching patterns             |

### 2.2 What is already good (preserve)

- Token discipline (`--oe-*` via Tailwind); no rogue palette colors in Creator TSX
- Teacher loop IA and view persistence
- Practice editor split (config + live preview)
- Share / AI review checklist hierarchy
- Widget picker search + domain badges
- Developer `EditorShell` density (correct for that mode — do not leak into Creator)

---

## 3. Goals & non-goals

### 3.1 Goals

1. **Product chrome** — Studio reads as OpenEdu Studio: logo, wordmark, active navigation, course context, clear primary CTA.
2. **One job per viewport** — Home creates; Outline structures; Editor writes; Preview validates; Share finishes.
3. **Authoring craft** — Outline and editors feel like a writing/teaching tool, not a file admin table.
4. **Coaching over schema** — Side panels and empty states speak teacher language.
5. **Mode intentionality** — Creator ↔ Developer is a deliberate second skin, not floating prototype chrome.
6. **Token fidelity** — All color/spacing/radius through `--oe-*`; theme-safe under Light / Dark / Zen.
7. **Accessibility & i18n** — axe-clean shells; all new copy via `studio.*` keys.

### 3.2 Non-goals

- New authoring capabilities (new activity types, hosted cloud, LMS)
- Replacing Developer `EditorShell` / inspectors
- Inventing a Studio-only color palette outside design-system tokens
- Rewriting wireframe cream/teal hexes literally into production CSS
- Card-wrapping every section for “polish”
- Changing package format or StudioAPI semantics (beyond optional UI-facing helpers)

---

## 4. Design principles (locked)

| #   | Principle                      | Application                                                                                                   |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | **Brand first in chrome**      | Logo + “OpenEdu Studio” are always readable in the header; page H1 never outranks brand in the first glance   |
| 2   | **One composition**            | First viewport of Home is a start composition, not a dashboard of equal cards                                 |
| 3   | **Visual DNA over local kits** | Prefer design-system patterns; extend only when Studio needs a Creator-specific shell                         |
| 4   | **Cards for interaction only** | Template selection and actionable course rows may use container treatment; decorative card chrome is removed  |
| 5   | **Quiet density**              | Default Creator spacing is calm; Developer stays dense by design                                              |
| 6   | **Coach, don’t dump**          | Validation appears as checklist coaching; schema paths only in Developer                                      |
| 7   | **Motion with purpose**        | 2–3 intentional motions (enter, select, reorder settle) — no noise                                            |
| 8   | **Avoid AI clichés**           | No purple-on-white gradients, cream+terracotta serif tropes, broadsheet hairlines, glow stacks, pill clusters |

---

## 5. Decisions (locked)

| Topic               | Decision                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual system       | Stay on OpenEdu tokens + Visual DNA; do **not** ship wireframe cream `#f3efe8` / teal hex as a Studio theme                                                                                                     |
| Shell approach      | New `StudioChrome` composition in `apps/dev-server` that **composes** `OpenEduLogo` + nav + actions; reuse `PageHeader` on content pages; do **not** force learner `TopAppBar`/`SideNav` semantics onto Creator |
| Navigation model    | Persistent top chrome with **active state**; breadcrumbs for depth (Outline → Activity); Library is a destination, not a duplicate of Home                                                                      |
| Home structure      | Single start composition: primary (templates) + secondary (AI) + quiet recent; Continue-current is a contextual strip when a course is open                                                                     |
| Outline interaction | Drag-reorder primary; keyboard ↑↓ retained for a11y; row click opens editor; destructive actions in overflow / confirm dialog                                                                                   |
| Add activity        | One primary **Add** control → menu (Lesson / Quiz / Practice)                                                                                                                                                   |
| Editor layout       | Canvas + coaching rail (2-column ≥`lg`); Practice keeps form \| preview; Lesson/Quiz gain coaching + optional mini preview                                                                                      |
| Advanced panels     | Styled accordion (Radix/DS), not bare `<details>`; left of Outline or below spine with clear “Advanced” labeling                                                                                                |
| Preview chrome      | Thin Studio overlay (Exit / Reset); no floating FABs in Creator                                                                                                                                                 |
| Developer chrome    | Toolbar / command row inside Developer shell; remove fixed bottom-right Edit/Reset cluster                                                                                                                      |
| Mode control        | Compact segmented control or overflow item; never compete visually with Share CTA                                                                                                                               |
| Typography          | Use existing DS type scale (`text-h1`/`text-h2`/body); no new serif brand font unless design-system adopts one globally                                                                                         |
| Motion              | Prefer CSS transitions / existing animation utilities; no new motion library in this track                                                                                                                      |

---

## 6. Information architecture (unchanged jobs, clearer chrome)

```
StudioChrome (always)
├─ Brand (logo + Studio)
├─ Context (course title · breadcrumb)
├─ Destinations: Library | Outline | Preview   [active]
├─ Primary CTA: Share
└─ Mode (Creator | Developer) — de-emphasized

Creator views (content region)
├─ home …………… start composition
├─ library …… course / unit management
├─ outline …… spine + advanced
├─ edit-activity … lesson | quiz | practice (+ coaching)
├─ ai-review …… draft accept/reject
├─ preview ……… learner runtime + overlay
├─ share ……… ready → export → instructions
└─ unit-builder … multi-course unit
```

Developer remains a mode swap (same package), not a parallel nav tree.

---

## 7. Visual language

### 7.1 Surfaces

| Role           | Token guidance                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| App background | `bg-surface` or `bg-surface-container-low` for subtle canvas contrast                                        |
| Chrome         | `bg-surface` + `border-outline-variant` bottom border; optional soft elevation via token shadow if available |
| Content panels | Prefer borderless sections with spacing hierarchy; bordered containers only for selectable/list groups       |
| Selected item  | `border-primary` + soft `bg-primary/5` (or token equivalent); never multi-layer glow                         |
| Destructive    | Existing `destructive` button variant; confirm dialogs unchanged in pattern                                  |

### 7.2 Brand mark

```
[OpenEduLogo sm]  OpenEdu Studio
                       ↑ “Studio” uses text-primary or text-on-surface-variant per DS logo pairing rules
```

- Wordmark via i18n (`studio.brand.name` / subtitle or a single combined key)
- Course title appears as breadcrumb / context chip — not a third competing title in the header

### 7.3 Type & hierarchy

| Level              | Use                                                                               |
| ------------------ | --------------------------------------------------------------------------------- |
| Brand (chrome)     | Semibold wordmark                                                                 |
| Page title         | `text-h1` once per view                                                           |
| Section title      | `text-h2`                                                                         |
| Meta / coaching    | `text-sm text-on-surface-variant`                                                 |
| Kickers (optional) | Uppercase tracking label in `text-primary` — sparingly (Home section labels only) |

### 7.4 Iconography

- Lucide icons already used in Outline — extend to nav and empty states for consistency
- Icon buttons need visible labels **or** accessible `aria-label` + tooltip
- Do not introduce emoji as UI decoration

### 7.5 Motion budget

| Motion          | Trigger              | Spec                                                                                          |
| --------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| View enter      | Route/view change    | 150–200ms opacity + 4–8px translateY; `prefers-reduced-motion: reduce` → opacity only or none |
| Template select | Click / keyboard     | Border/ring settle 120ms                                                                      |
| Outline reorder | Drop / keyboard move | Row settle 150ms                                                                              |

No continuous ambient animation on Home.

---

## 8. Screen designs

### 8.1 Studio chrome

**Job:** Orient, navigate, promote Share, de-emphasize mode.

**Layout (desktop):**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo] OpenEdu Studio   Fractions warm-up / Outline          [Lib][Out*] │
│                                                    [Preview] [Share] [≡] │
└──────────────────────────────────────────────────────────────────────────┘
│                                                                          │
│                          Content region                                  │
│                                                                          │
```

**Behaviors:**

- Active destination uses filled or underline active style (not identical ghost buttons)
- On Home with no course: hide Outline/Preview/Share or disable with tooltip (“Open or create a course first”) — pick one pattern and keep it consistent (prefer **disabled + tooltip** if course required)
- Breadcrumbs: `Home` | `{Course} / Outline` | `{Course} / {Activity}` | `{Course} / Share`
- Mode toggle moves to overflow menu **or** compact segmented control at far right with muted styling
- Sticky header; wrap gracefully on narrow widths (brand + Share + menu first)

**Mobile (< md):**

- Brand + Share + hamburger/overflow containing Library, Outline, Preview, Mode
- Content full-bleed with `p-4`

**Files:** evolve `StudioTopBar.tsx` → `StudioChrome.tsx` (or keep name, change implementation); update `StudioApp.tsx` layout wrapper.

---

### 8.2 Home — start composition

**Job:** Start a course (template or AI) or resume quietly.

**First viewport (one composition):**

1. PageHeader: title + one lede (“Start from a template or notes. Leave with a shareable package.”)
2. Contextual **Continue** strip (only if course open) — single row, not a Card section
3. **Templates** — selectable gallery (2×2 / auto-fit); selected state; primary **Use template** once for selection (optional **Preview template** later)
4. Below fold or secondary band: **AI start** (`AiStartPanel`) with kicker “Or start with AI”
5. Quiet **Recent** list with title · relative time · status; Library link as text action

**Anti-patterns to remove:**

- Four equal `h2` + Card stacks
- Identical CTA on every template card
- EmptyState with empty `description=""`

**Empty recent:** EmptyState with short description + CTA to Library or templates.

**Files:** `HomeView.tsx`, `AiStartPanel.tsx`, template catalog presentation helpers if needed.

---

### 8.3 Library & unit builder

**Job:** Manage courses/units.

**Polish only in this track:**

- PageHeader + clear primary Import / New actions
- List rows over decorative cards where possible
- Archive/rename/duplicate behind overflow
- Unit builder: clear step indicator (Select courses → Order → Create)

No IA redesign beyond visual hierarchy.

---

### 8.4 Outline — course spine

**Job:** See and shape the activity sequence.

**Layout (≥ lg):**

```
┌─────────────┬────────────────────────────────────────┐
│ Course meta │ Outline                          [Add ▾]│
│ Settings    │ ┌────────────────────────────────────┐ │
│ Advanced ▾  │ │ ⋮⋮  LESSON  What is a fraction?   │ │
│ Tips        │ │ ⋮⋮  QUIZ    Quick check           │ │
│             │ │ ⋮⋮  PRACTICE Build a fraction     │ │
│             │ └────────────────────────────────────┘ │
│ Ready? →    │                                        │
└─────────────┴────────────────────────────────────────┘
```

**On smaller screens:** stack meta above spine; Add sticky near header.

**Row anatomy:**

- Drag handle (visible on hover/focus; always keyboard-operable)
- Kind badge (Lesson / Quiz / Practice)
- Title (truncate)
- Optional one-line meta (e.g. “Multiple choice · 3 options”) when cheap to compute
- Overflow menu: Edit, Move up, Move down, Delete
- Selected / hover states; entire row clickable to Edit (except handle / menu)

**Add menu:** Lesson | Quiz | Practice (opens WidgetPicker)

**Advanced:** Flow + Rewards as designed accordion panels with short helper copy — not native `<details>` dump at bottom only (may keep bottom placement if left rail deferred; prefer left rail on desktop).

**Course health strip:** activity count + ready/not-ready affordance linking to Share (reuse ready-check summary if available without heavy refetch).

**Loading:** skeleton rows, never bare `…`.

**Files:** `OutlineView.tsx`, possibly `OutlineActivityRow.tsx`, `AddActivityMenu.tsx`, accordion wrapper for Flow/Rewards.

---

### 8.5 Activity editors

**Shared pattern (≥ lg):**

```
┌────────────────────────────────┬─────────────────────┐
│ PageHeader (title, Back)       │ Coaching            │
│ Canvas form                    │ ✓ / ! checklist     │
│                                │ Tips                │
│ [Save state in chrome or bar]  │ Mini preview (opt.) │
└────────────────────────────────┴─────────────────────┘
```

#### Lesson

- Title field (synced to first Markdown heading — keep existing behavior)
- Writing surface: comfortable `Textarea` or split Write | Preview tabs (Markdown preview using existing runtime/markdown path if available without large new deps)
- Coaching examples: “Add a clear heading”, “Aim for one idea per lesson”, heading present/absent
- Remove “raw IDE” feel: drop monospace unless Preview/source toggle explicitly shows source

#### Quiz

- Question + option list with strong correct-answer affordance (keep RadioGroup pattern)
- Coaching: has correct answer, option count, short question tip
- Optional mini preview card

#### Practice

- Preserve two-column config + live preview + WidgetGuide
- Align headers/spacing with Lesson/Quiz PageHeader pattern
- Coaching can reuse validation errors mapped to plain language (existing validator)

**Save UX:**

- Primary Save in editor footer **or** sticky local bar
- Success via button state / subtle toast — keep short confirmation, avoid layout jump

**Files:** `LessonActivityEditor.tsx`, `QuizActivityEditor.tsx`, `PracticeActivityEditor.tsx`, new `EditorCoachingPanel.tsx`, `ActivityEditorRouter.tsx` layout wrapper.

---

### 8.6 AI review

**Job:** Accept/reject draft with quality coaching.

**Polish:** Keep checklist hierarchy; align PageHeader; clearer Accept (primary) vs Reject (destructive/outline) pairing; skeleton while generating if applicable.

---

### 8.7 Preview

**Job:** Experience the course as a learner without DevTools.

**Chrome:**

```
┌─ Studio preview bar: Exit preview · Reset progress · (optional theme) ─┐
│                                                                         │
│                     Full LayoutShell / runtime                          │
│                                                                         │
```

- Bar is thin, high contrast but not floating FABs over content corners
- No InspectorPanel in Creator
- Exit returns to previous Creator view (Outline or last editor)

**Files:** `CreatorPreview.tsx`; ensure `DevApp` Creator path does not inject Developer FAB cluster.

---

### 8.8 Share

**Job:** Prove readiness → export → instruct learner install.

**Polish:**

- PageHeader + status (Ready / Not ready)
- Checklist as primary visual (already strong)
- Single dominant **Export .oep** when ready; disabled + coaching when not
- How-to steps as numbered quiet list (not nested cards)
- Success state after export: confirmation + copy instructions CTA

---

### 8.9 Developer mode chrome

**Job:** Power tools without prototype residue.

| Remove                                            | Replace with                                                   |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Fixed `bottom-4 right-96` Edit/Reset/Mode cluster | Developer toolbar under header or inside `EditorShell` top bar |
| Hardcoded “Edit Package” English in FAB           | i18n keys                                                      |
| Abrupt personality clash                          | Optional “Developer tools” banner/chip so mode is labeled      |

Inspectors remain; density remains. This track does **not** restyle DevTools tabs beyond containment.

**Files:** `DevApp.tsx`, `EditorShell.tsx` (toolbar slot), `ModeToggle.tsx` styling.

---

## 9. Component plan

### 9.1 Reuse from `@open-edu/design-system`

| Component                                                                                                                 | Studio use                             |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `OpenEduLogo`                                                                                                             | Chrome brand                           |
| `PageHeader`                                                                                                              | Home, Outline, editors, Share, Library |
| `Button`, `Badge`, `EmptyState`, `Dialog*`, `Input`, `Textarea`, `Switch`, `Tabs`, `Select`, `DropdownMenu` (if exported) | Controls                               |
| `cn`                                                                                                                      | Class composition                      |
| Accordion / Collapsible primitives if present; else Radix via DS patterns                                                 | Advanced panels                        |

### 9.2 Studio-local compositions (new or evolved)

| Component             | Responsibility                                      |
| --------------------- | --------------------------------------------------- |
| `StudioChrome`        | Sticky header: brand, breadcrumbs, nav, Share, mode |
| `StudioNavItem`       | Active/inactive nav button styles                   |
| `HomeTemplateGallery` | Selectable templates + single Use action            |
| `OutlineActivityRow`  | Drag handle, badge, title, overflow                 |
| `AddActivityMenu`     | Unified add entry                                   |
| `EditorCoachingPanel` | Checklist + tips slot                               |
| `StudioPreviewBar`    | Exit / Reset overlay for Creator preview            |
| `DeveloperToolbar`    | Edit package / Reset / mode containment             |

### 9.3 Explicitly do not build

- Parallel Studio design-system package
- Custom card kit duplicating DS `Card`
- New illustration language for Studio (optional Open Module empty states only if already cheap)

---

## 10. Interaction & accessibility requirements

1. **Keyboard:** Full nav, outline reorder, template selection, menus operable without pointer.
2. **Focus:** Visible focus rings via DS; after view change, move focus to `h1` or main landmark.
3. **Drag + keyboard parity:** Drag is enhancement; ↑↓ (or menu Move) always available.
4. **Dialogs:** Existing overwrite/delete confirms retained; focus trap via DS Dialog.
5. **Live regions:** Save success and export success announced politely (aria-live).
6. **Contrast:** All states pass under Light/Dark/Zen; verify selected template and active nav.
7. **Reduced motion:** Honor `prefers-reduced-motion`.
8. **axe:** Shell + Home + Outline + one editor + Share smoke tests (extend existing `studio-a11y.test.tsx`).

---

## 11. Internationalization

- All new strings in `packages/i18n/locales/en/studio.json`
- No hardcoded user-facing English in new chrome/toolbars (fix Developer FAB strings)
- Nav active state is visual only; labels remain translated
- Breadcrumb separators are decorative (`aria-hidden`) with a single accessible location string if needed

---

## 12. Responsive breakpoints

| Breakpoint | Behavior                                                                         |
| ---------- | -------------------------------------------------------------------------------- |
| `< md`     | Compact chrome (overflow menu); single-column editors; outline stacked           |
| `md–lg`    | Chrome expands; editors may stack coaching below canvas                          |
| `≥ lg`     | Outline optional left rail; editors canvas \| coaching; Practice form \| preview |

Touch targets ≥ 40px for icon controls.

---

## 13. Phased delivery

### Phase A — Chrome & hierarchy (visual product win)

**Ship:**

- `StudioChrome` with logo, active nav, breadcrumbs, Share CTA, quiet mode control
- Home start composition (template gallery selection pattern + quiet recent)
- Empty/loading polish (skeletons, EmptyState descriptions)
- Creator Preview bar (Exit/Reset)
- Remove Developer floating FAB cluster → `DeveloperToolbar`

**Exit criteria:** Cold open feels branded; Share is obvious; no floating prototype buttons; Home first viewport has one job.

### Phase B — Authoring craft

**Ship:**

- Outline drag + quieter rows + Add menu
- Advanced accordion polish
- `EditorCoachingPanel` on Lesson + Quiz
- Lesson Write/Preview improvement (if preview path is low-risk)
- PageHeader consistency across Library / Share / AI review

**Exit criteria:** Outline feels like a spine; Lesson/Quiz no longer feel like raw schema forms.

### Phase C — Atmosphere & cohesion

**Ship:**

- Motion budget (enter, select, reorder)
- Course health strip on Outline
- Share success celebration (subtle)
- Cross-theme visual QA pass (Light/Dark/Zen)
- Optional left meta rail on Outline desktop

**Exit criteria:** Hallway test — 4/5 teachers describe Studio as “a product for making courses,” not “a form admin.”

---

## 14. Success metrics

| Metric            | Target                                                                             |
| ----------------- | ---------------------------------------------------------------------------------- |
| Brand recognition | Logo + Studio wordmark visible without scrolling on Home                           |
| Nav clarity       | Active destination identifiable without reading URL/state dumps                    |
| Time-to-orient    | New teacher names current step (Create / Outline / Edit / Preview / Share) in ≤10s |
| Chrome noise      | Zero floating action clusters overlapping content in Creator and Developer         |
| a11y              | No serious axe violations on shell + Home + Outline + Share                        |
| Theme             | No broken contrast in Dark/Zen for chrome/active/selected states                   |
| Regression        | Existing Studio Vitest suites green; no package-format changes                     |

---

## 15. Risks & mitigations

| Risk                                    | Mitigation                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| Over-scoping into new features          | Phases A→C; this track is visual/UX only                                                     |
| Fighting learner `TopAppBar` semantics  | Compose Studio-local chrome from primitives + logo, don’t force learner breadcrumbs/progress |
| Drag-and-drop a11y debt                 | Keyboard reorder first; drag as progressive enhancement                                      |
| Theme regressions                       | Token-only styling; manual QA matrix                                                         |
| i18n gaps                               | Lint hardcoded strings; update `studio.json` in same PR as UI                                |
| Design-system gaps (dropdown/accordion) | Prefer existing DS exports; thin local Radix wrapper only if missing, then upstream later    |

---

## 16. Open questions

Resolve during Phase A implementation kickoff:

1. **Disabled vs hidden nav** when no course is open — prefer disabled + tooltip?
2. **Lesson Markdown preview** — reuse runtime markdown renderer vs tabbed source-only for Phase B?
3. **Outline left rail** — Phase B (accordion below) vs Phase C (rail)?
4. **Mode control placement** — always visible compact segmented vs overflow-only on Creator?
5. **Template preview** — out of scope until a cheap preview path exists?

---

## 17. File impact map (directional)

| Area                 | Primary files                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Shell                | `studio/components/StudioTopBar.tsx`, `studio/StudioApp.tsx`, `studio/components/ModeToggle.tsx`               |
| Home                 | `studio/components/HomeView.tsx`, `AiStartPanel.tsx`                                                           |
| Outline              | `studio/components/OutlineView.tsx`, Flow/Rewards panels                                                       |
| Editors              | `LessonActivityEditor.tsx`, `QuizActivityEditor.tsx`, `PracticeActivityEditor.tsx`, `ActivityEditorRouter.tsx` |
| Preview              | `studio/CreatorPreview.tsx`                                                                                    |
| Share / Library / AI | `ShareView.tsx`, `LibraryView.tsx`, `AiReviewView.tsx`, `UnitBuilderView.tsx`                                  |
| Developer            | `DevApp.tsx`, `editor/EditorShell.tsx`                                                                         |
| i18n                 | `packages/i18n/locales/en/studio.json`                                                                         |
| Tests                | Co-located `*.test.tsx`, `studio-a11y.test.tsx`                                                                |
| CSS                  | Prefer Tailwind tokens; regenerate/dev-server CSS only if shared runtime classes change                        |

---

## 18. Relationship to existing docs

| Doc                                                 | Relationship                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `2026-08-05-course-creator-studio-design.md`        | Parent product/UX IA — this track executes the **visual** intent that Phase 0 branded but did not craft |
| `course-creator-studio/wireframes/*`                | Hierarchy & coaching reference — **not** a literal color system to copy                                 |
| `2026-07-03-visual-dna-design.md` / COMPONENT_GUIDE | Token + pattern constraints                                                                             |
| Phase 0–4 implementation plans                      | Feature work largely done; this track is a polish epic on top                                           |

---

## 19. Acceptance checklist (definition of done for the epic)

- [ ] Studio chrome shows logo, active nav, breadcrumbs, dominant Share
- [ ] Home first viewport is a start composition (not four equal card sections)
- [ ] Outline supports keyboard reorder; drag if shipped; quieter row chrome; unified Add
- [ ] Lesson & Quiz include coaching panel content
- [ ] Creator Preview uses overlay bar; no floating FABs
- [ ] Developer Edit/Reset live in toolbar, not fixed viewport cluster
- [ ] All new strings i18n’d; axe smoke green; Vitest green
- [ ] Light / Dark / Zen spot-checked for chrome + Home + Outline
