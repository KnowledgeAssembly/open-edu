# Course Creator Studio — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Creator mode so teachers can add practice widgets (catalog picker + schema forms + live preview), set simple score-based branching, and configure guided rewards/knowledge cards — then still export `.oep`.

**Architecture:** Build on Phase 0–1 `apps/dev-server/src/studio/` façade and `StudioAPI`. Reuse Developer-mode building blocks (`SchemaForm`, `WidgetPreviewPanel`, `useWidgetConfig`, `WidgetValidator`, workflow/rewards/cards schemas) behind Creator-facing UIs that speak teacher language. Persist to the same OpenEdu package files (`nodes/*.json`, `workflow.json`, `rewards.json`, `cards.json`).

**Tech Stack:** React 18, Vitest, `@open-edu/design-system`, `@open-edu/i18n` (`studio`), `@open-edu/widgets` / `@open-edu/core` widget catalog, `@open-edu/schemas`, existing editor preview stack

**Prerequisites:** Phase 0–1 complete (`StudioApp`, outline, lesson/quiz editors, share/export, Creator/Developer mode).  
**Spec:** `docs/superpowers/specs/2026-08-05-course-creator-studio-design.md` § Phase 2  
**Related plan:** `docs/superpowers/plans/2026-08-05-course-creator-studio-phase0-1.md`

**Out of scope:** AI generation (Phase 3), multi-course library/bundles (Phase 4), hosted cloud (Phase 5), raw condition expression language beyond a fixed simple set.

---

## Architecture & design-system constraints (mandatory)

Same as Phase 0–1, plus:

1. New Studio UI imports `@open-edu/design-system` directly; tokens only; `t('studio.*')` for Creator copy.
2. Prefer **wrapping/adapting** `apps/dev-server/src/editor/SchemaForm.tsx` and `WidgetPreviewPanel.tsx` over rewriting — if SchemaForm still imports local `components/ui`, either pass through or migrate those imports to design-system when touching the file.
3. Widget node on-disk shape matches examples: `{ "type": "exercise", "widget": "<id>", "config": { ... } }` (see `examples/widget-practice/nodes/practice.json`).
4. Curate a **teacher allowlist** of stable widgets (not the full experimental catalog) in `studio/widgets/curatedCatalog.ts`.
5. Branching UI writes `workflow.json` routes with `conditions` using only the simple shapes already supported by runtime/WorkflowEditor (`if` / `then` score checks) — map teacher phrases → those expressions in one pure helper.
6. Rewards/cards: guided templates first; “Advanced JSON” only behind a collapsed disclosure or Developer mode.

---

## File structure

| File                                                                    | Status | Responsibility                                         |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| `packages/i18n/locales/en/studio.json`                                  | Modify | Widget/flow/rewards copy                               |
| `apps/dev-server/src/studio/widgets/curatedCatalog.ts`                  | Create | Allowlisted widgets for teachers                       |
| `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`             | Create | Allowlist tests                                        |
| `apps/dev-server/src/studio/widgets/exerciseNode.ts`                    | Create | Build/parse exercise node JSON                         |
| `apps/dev-server/src/studio/widgets/exerciseNode.test.ts`               | Create | Node JSON tests                                        |
| `apps/dev-server/src/studio/flow/branchModel.ts`                        | Create | Linear ↔ guided branch mapping                         |
| `apps/dev-server/src/studio/flow/branchModel.test.ts`                   | Create | Branch mapping tests                                   |
| `apps/dev-server/src/studio/rewards/rewardTemplates.ts`                 | Create | Simple badge/card templates → JSON                     |
| `apps/dev-server/src/studio/rewards/rewardTemplates.test.ts`            | Create | Template tests                                         |
| `apps/dev-server/src/studio/components/WidgetPicker.tsx`                | Create | Catalog picker UI                                      |
| `apps/dev-server/src/studio/components/WidgetPicker.test.tsx`           | Create | Picker tests                                           |
| `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`      | Create | Widget config + live preview                           |
| `apps/dev-server/src/studio/components/PracticeActivityEditor.test.tsx` | Create | Practice editor tests                                  |
| `apps/dev-server/src/studio/components/FlowAdvancedPanel.tsx`           | Create | Guided branching                                       |
| `apps/dev-server/src/studio/components/FlowAdvancedPanel.test.tsx`      | Create | Flow UI tests                                          |
| `apps/dev-server/src/studio/components/RewardsCardsPanel.tsx`           | Create | Guided rewards/cards                                   |
| `apps/dev-server/src/studio/components/RewardsCardsPanel.test.tsx`      | Create | Rewards UI tests                                       |
| `apps/dev-server/src/studio/components/ActivityEditorRouter.tsx`        | Modify | Route `practice` → PracticeActivityEditor              |
| `apps/dev-server/src/studio/components/OutlineView.tsx`                 | Modify | Add Practice action                                    |
| `apps/dev-server/src/studio/studioApi.ts`                               | Modify | Optional helpers for rewards/cards/workflow read-write |
| `apps/dev-server/src/studio/readyCheck.ts`                              | Modify | Widget config + rewards sanity checks                  |
| `apps/dev-server/src/studio/StudioApp.tsx`                              | Modify | Wire Advanced panels from Outline/settings             |

---

### Task 1: i18n keys for Phase 2 surfaces

**Files:**

- Modify: `packages/i18n/locales/en/studio.json`

- [ ] **Step 1: Add keys** (merge into existing file)

```json
{
  "outline.addPractice": "Add practice",
  "widget.pickerTitle": "Choose a practice activity",
  "widget.pickerSearch": "Search practices",
  "widget.useWidget": "Use this practice",
  "widget.configTitle": "Practice settings",
  "widget.previewTitle": "Live preview",
  "widget.validationFix": "Fix the highlighted settings before saving",
  "flow.title": "Learning path",
  "flow.linearHelp": "Learners go through activities in outline order.",
  "flow.addBranch": "Add a score rule",
  "flow.afterActivity": "After this activity",
  "flow.ifScoreAtLeast": "If score is at least",
  "flow.thenGoTo": "Then go to",
  "flow.otherwiseGoTo": "Otherwise go to",
  "flow.removeBranch": "Remove rule",
  "rewards.title": "Rewards & cards",
  "rewards.addBadge": "Add completion badge",
  "rewards.badgeName": "Badge name",
  "rewards.whenComplete": "When learner finishes the course",
  "rewards.whenQuizPass": "When learner passes a quiz",
  "rewards.addCard": "Add knowledge card",
  "rewards.cardTitle": "Card title",
  "rewards.cardBody": "Card text",
  "rewards.empty": "No rewards yet. Add a badge or card to celebrate progress."
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/i18n/locales/en/studio.json
git commit -m "$(cat <<'EOF'
feat(i18n): add studio copy for widgets, flow, and rewards

EOF
)"
```

---

### Task 2: Curated widget catalog + exercise node helpers

**Files:**

- Create: `apps/dev-server/src/studio/widgets/curatedCatalog.ts`
- Create: `apps/dev-server/src/studio/widgets/curatedCatalog.test.ts`
- Create: `apps/dev-server/src/studio/widgets/exerciseNode.ts`
- Create: `apps/dev-server/src/studio/widgets/exerciseNode.test.ts`

- [ ] **Step 1: Write failing curated catalog test**

```ts
import { describe, it, expect } from 'vitest';
import { listCuratedWidgets, getCuratedWidget } from './curatedCatalog';

describe('curatedCatalog', () => {
  it('returns only allowlisted stable widgets', () => {
    const list = listCuratedWidgets();
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list.every((w) => w.id && w.name && !w.deprecated)).toBe(true);
    expect(getCuratedWidget('core.multiple-choice')?.id).toBe('core.multiple-choice');
  });

  it('excludes unknown ids', () => {
    expect(getCuratedWidget('not.a.widget')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Implement curated catalog**

Source metadata from `@open-edu/core` `getDefaultWidgetCatalog()` **or** import generated catalog data the same way `packages/core` does. Keep an explicit allowlist array (Phase 2 starter set):

```ts
export const CURATED_WIDGET_IDS = [
  'core.multiple-choice',
  'core.matching',
  'core.ordering', // only if present in catalog; drop if missing
  'math.fraction-visual', // only if present; drop if missing
] as const;
```

Filter to entries that exist, `status !== 'deprecated'`, and `deprecated !== true`. Expose `{ id, name, description, domain, guide? }`.

If a listed id is missing from catalog, omit it (don’t fail the app) and assert in tests only on ids known to exist in-repo (at minimum `core.multiple-choice` and `core.matching` from examples).

- [ ] **Step 3: exerciseNode helpers**

```ts
export interface ExerciseNode {
  type: 'exercise';
  title?: string;
  widget: string;
  config: Record<string, unknown>;
}

export function parseExerciseNode(content: string): ExerciseNode | null {
  try {
    const parsed = JSON.parse(content) as Partial<ExerciseNode> & { type?: string };
    if (parsed.type !== 'exercise' || typeof parsed.widget !== 'string') return null;
    return {
      type: 'exercise',
      title: typeof parsed.title === 'string' ? parsed.title : undefined,
      widget: parsed.widget,
      config: (parsed.config as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}

export function serializeExerciseNode(node: ExerciseNode): string {
  return JSON.stringify(
    {
      type: 'exercise',
      ...(node.title ? { title: node.title } : {}),
      widget: node.widget,
      config: node.config,
    },
    null,
    2,
  );
}

export function createEmptyExercise(widgetId: string, title = 'Practice'): ExerciseNode {
  return { type: 'exercise', title, widget: widgetId, config: {} };
}
```

Align with `ContentNodeSchema` if it requires extra fields — read schema and examples (`examples/widget-practice/nodes/practice.json`) and include required keys.

- [ ] **Step 4: Run tests — PASS; commit**

```bash
pnpm --filter @open-edu/dev-server test -- curatedCatalog.test.ts exerciseNode.test.ts
git commit -m "$(cat <<'EOF'
feat(dev-server): add curated widget catalog and exercise node helpers

EOF
)"
```

---

### Task 3: WidgetPicker + PracticeActivityEditor

**Files:**

- Create: `apps/dev-server/src/studio/components/WidgetPicker.tsx`
- Create: `apps/dev-server/src/studio/components/WidgetPicker.test.tsx`
- Create: `apps/dev-server/src/studio/components/PracticeActivityEditor.tsx`
- Create: `apps/dev-server/src/studio/components/PracticeActivityEditor.test.tsx`
- Modify: `ActivityEditorRouter.tsx`, `OutlineView.tsx`

- [ ] **Step 1: WidgetPicker UI test**

Render picker with mocked curated list; filter by search; clicking “Use this practice” calls `onSelect(id)`.

- [ ] **Step 2: Implement WidgetPicker**

Use `Card`, `Button`, `Input`, `Badge`, `EmptyState` from `@open-edu/design-system`. Show name + description; optional domain badge.

- [ ] **Step 3: PracticeActivityEditor**

Structure:

```tsx
// Left: title Input + SchemaForm bound to config
// Right: WidgetPreviewPanel (reuse from editor/)
// Save writes serializeExerciseNode via studioApi.writeFile
```

Reuse:

- `useWidgetConfig` / `validateWidgetConfigForType` from `apps/dev-server/src/editor/`
- `SchemaForm` with `fieldLabels` derived from `guide.configFields` when available
- `WidgetPreviewPanel` wrapped in existing preview provider patterns from EditorShell

Coaching panel: map validation errors to plain language (`widget.validationFix`) — do not show raw Zod paths as primary text.

- [ ] **Step 4: Outline “Add practice”**

Flow: open WidgetPicker dialog (`Dialog` from design-system) → create `nodes/practice-<ts>.json` via `serializeExerciseNode(createEmptyExercise(id))` → append to outline order via `saveOutlineOrder`.

- [ ] **Step 5: Router**

When `kind === 'practice'`, render `PracticeActivityEditor` instead of Developer-mode stub.

- [ ] **Step 6: Tests PASS + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add creator widget picker and practice activity editor

EOF
)"
```

---

### Task 4: Guided branching (`branchModel` + FlowAdvancedPanel)

**Files:**

- Create: `apps/dev-server/src/studio/flow/branchModel.ts`
- Create: `apps/dev-server/src/studio/flow/branchModel.test.ts`
- Create: `apps/dev-server/src/studio/components/FlowAdvancedPanel.tsx`
- Create: `apps/dev-server/src/studio/components/FlowAdvancedPanel.test.tsx`

- [ ] **Step 1: Define teacher-facing branch rule type**

```ts
export interface ScoreBranchRule {
  afterPath: string;
  minScore: number; // 0–1 or 0–100 — pick one and document; prefer 0–1 to match runtime if scores are normalized
  passPath: string;
  failPath: string;
}
```

Read `@open-edu/schemas` WorkflowSchema + how `WorkflowEditor` encodes `conditions` (`if` / `then`). Implement:

- `extractScoreBranches(workflow): ScoreBranchRule[]` — best-effort parse of known simple patterns; ignore complex rules (leave untouched on save)
- `applyScoreBranch(workflow, rule): workflow` — sets routing for `afterPath`
- `clearScoreBranch(workflow, afterPath): workflow` — restore linear `onComplete`/`next` to outline successor

**Critical:** When applying/clearing branches, preserve unrelated routes. Round-trip test: linear → add branch → clear → linear.

- [ ] **Step 2: FlowAdvancedPanel UI**

Collapsed by default under Outline (“Learning path”). Fields:

- After activity: `Select` of outline activities
- Min score: `Input` type number
- Pass / fail targets: `Select` of activities + “End course” sentinel matching runtime `COMPLETED` if used

Save via `studioApi.writeFile('workflow.json', ...)` or dedicated `saveWorkflow` helper.

Copy must stay teacher-facing (no “routing key”, no “onComplete”).

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add guided score-based branching for creator flow

EOF
)"
```

---

### Task 5: Guided rewards & knowledge cards

**Files:**

- Create: `apps/dev-server/src/studio/rewards/rewardTemplates.ts`
- Create: `apps/dev-server/src/studio/rewards/rewardTemplates.test.ts`
- Create: `apps/dev-server/src/studio/components/RewardsCardsPanel.tsx`
- Create: `apps/dev-server/src/studio/components/RewardsCardsPanel.test.tsx`

- [ ] **Step 1: Template builders**

Inspect `RewardsSchema` / `CardDefinitionsSchema` and an example package with rewards/cards (`examples/living-vs-nonliving` or similar). Implement pure functions:

```ts
export function badgeOnWorkflowComplete(badgeName: string): unknown; // rewards.json shape
export function badgeOnQuizPass(badgeName: string, nodePath?: string): unknown;
export function simpleKnowledgeCard(id: string, title: string, body: string): unknown; // cards.json entry
```

Validate with schema `safeParse` in tests.

- [ ] **Step 2: RewardsCardsPanel**

- List existing triggers/cards in plain language
- Buttons: Add completion badge, Add quiz-pass badge, Add knowledge card
- Forms use design-system `Input` / `Textarea` / `Button` / `Dialog`
- Persist `rewards.json` / `cards.json` (create file if missing)
- Wire `package.json` optional `rewards` / `cards` fields if schema requires path references — mirror how examples declare them

- [ ] **Step 3: readyCheck extensions**

Add optional checks:

- If `rewards.json` exists, it parses
- If practice nodes exist, widget id is curated or at least non-empty

Do not block export solely because rewards are absent.

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): add guided rewards and knowledge card authoring

EOF
)"
```

---

### Task 6: Phase 2 acceptance wiring + verification

**Files:**

- Modify: `StudioApp.tsx`, `OutlineView.tsx`, `readyCheck.ts` as needed
- Modify: `StudioApp.test.tsx` / integration coverage

- [ ] **Step 1: Manual acceptance**

1. Creator mode → Add practice → pick `core.multiple-choice` → configure → preview widget live
2. Add score rule after quiz → preview path behavior
3. Add completion badge → preview/export still works
4. Export `.oep` succeeds
5. Developer mode still opens file editors / inspectors

- [ ] **Step 2: Automated verification**

```bash
pnpm --filter @open-edu/dev-server test
pnpm --filter @open-edu/dev-server typecheck
pnpm --filter @open-edu/dev-server lint
```

- [ ] **Step 3: Final commit if polish needed**

```bash
git commit -m "$(cat <<'EOF'
feat(dev-server): complete Course Creator Studio Phase 2 creator surfaces

EOF
)"
```

---

## Phase 2 exit criteria

- [ ] Teacher can add a practice widget without raw JSON
- [ ] Live widget preview works in Creator
- [ ] Optional score branch writes valid `workflow.json`
- [ ] Optional badge/card via guided forms
- [ ] Share/export still works
- [ ] Design-system + i18n constraints held

## Follow-on

Phase 3 plan: `docs/superpowers/plans/2026-08-05-course-creator-studio-phase3.md`
