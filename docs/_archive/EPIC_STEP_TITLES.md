# Epic: Human-Readable Step Titles

Improves the course workflow left navigation to show meaningful step titles instead of raw node file paths. Also fixes the `COMPLETED` sentinel leaking into the step list.

## Problem

1. **Raw node IDs in left nav** — `ContentNode` schema has no `title` field, so all 6 UI consumers fall back to `node.relativePath` (e.g. `nodes/intro`, `nodes/variables-quiz`)
2. **"COMPLETED" appears as a step** — `getOrderedNodes()` BFS pushes the `COMPLETED` sentinel into the result before checking if it's a valid routing key
3. **No title extraction for markdown** — `.md` files get `{ type: 'lesson' }` with zero metadata; the `# Heading` inside the content is never parsed

## Design Decisions

- **`title` is optional** on all node types — existing nodes without titles still validate and fall back to a humanized path
- **Markdown titles come from the first `# Heading`** — parsed at load time, no frontmatter or config duplication needed
- **JSON node titles live in the node file itself** — co-located with content, not in `workflow.json`
- **`COMPLETED` sentinel excluded from BFS** — prevents the literal string from appearing in step lists

## Impact Map

| Area                                                                | Impact | Action                                                                |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `packages/schemas/src/nodes.ts`                                     | High   | Add `title: z.string().optional()` to all 5 node schemas              |
| `packages/schemas/src/nodes.test.ts`                                | High   | Add title validation tests                                            |
| `packages/schemas/src/index.ts`                                     | None   | Barrel re-exports all schemas, no changes needed                      |
| `packages/core/src/nodes.ts`                                        | High   | Extract `# Heading` from markdown, validate JSON `title`              |
| `packages/core/src/nodes.test.ts`                                   | High   | Add title extraction tests for markdown + JSON                        |
| `packages/workflow/src/topology.ts`                                 | High   | Skip `COMPLETED` sentinel in BFS                                      |
| `packages/workflow/src/topology.test.ts`                            | High   | Add COMPLETED exclusion tests                                         |
| `packages/runtime/src/layout/Sidebar.tsx`                           | Medium | Use typed `node.node.title`, remove type cast                         |
| `packages/runtime/src/layout/Sidebar.test.tsx`                      | None   | Already passes `title` in mock — no changes needed                    |
| `packages/runtime/src/renderers/NodeRenderer.tsx`                   | Medium | Use typed `node.node.title`                                           |
| `packages/runtime/src/context/RuntimeContext.tsx`                   | Medium | Use typed `currentNode.node.title`                                    |
| `packages/runtime/src/embed.tsx`                                    | Medium | Use typed `currentNode.node.title`                                    |
| `packages/runtime/src/embed.test.tsx`                               | Low    | Update mock to include `title` if needed                              |
| `apps/learner/src/AppShell.tsx`                                     | Medium | Use typed `node.node.title` , remove type cast                        |
| `apps/learner/src/ProgressDashboard.tsx`                            | Medium | Use typed `n.node.title`                                              |
| `packages/course-compiler/src/generators/package-generator.ts`      | Medium | Add `title` to generated quiz JSON                                    |
| `packages/course-compiler/src/generators/package-generator.test.ts` | Medium | Update tests for title in quiz JSON                                   |
| `packages/core/src/learn-easy-importer.ts`                          | None   | Already emits `title: activity.title` — will work correctly now       |
| `packages/core/src/agent-prompt.ts`                                 | Low    | Add `"title"` to Node Type Catalog docs for each node type            |
| `packages/core/src/__fixtures__/valid-package/nodes/`               | Low    | Add `title` to fixture JSON nodes, verify markdown heading extraction |
| `apps/docs/docs/package-format.md`                                  | Low    | Add optional `"title"` to all 5 JSON node examples                    |
| `apps/docs/docs/package-authoring.md`                               | Low    | Add optional `"title"` to all 5 JSON node examples                    |
| `examples/*/nodes/*.json`                                           | Medium | Add `"title"` to every example JSON node file (28 files)              |

## Stories

---

### Story 1: Add `title` field to ContentNode schema

**Package:** `@open-edu/schemas`
**Files:** `packages/schemas/src/nodes.ts`, `packages/schemas/src/nodes.test.ts`
**Depends on:** None
**Estimated effort:** Small (30 min)

#### Objective

Add an optional `title` field to all 5 node schemas so downstream consumers can access it as a typed property on `ContentNode`.

#### Implementation

In `packages/schemas/src/nodes.ts`:

1. Create a shared base fields object to avoid repetition:

```typescript
const NodeFields = {
  title: z.string().max(256).optional(),
  skills: SkillsSchema.optional(),
} as const;
```

2. Spread `NodeFields` into each of the 5 node schema objects:

```typescript
export const LessonNodeSchema = z.object({
  type: z.literal('lesson'),
  ...NodeFields,
});

export const QuizNodeSchema = z.object({
  type: z.literal('quiz'),
  ...NodeFields,
  ...QuizConfigSchema.shape,
});

// Same pattern for ReflectionNodeSchema, ExerciseNodeSchema, WidgetNodeSchema
```

3. The discriminated union and types remain unchanged — `title` is now part of `ContentNode`.

#### Tests (`packages/schemas/src/nodes.test.ts`)

Add to each schema's test block:

- Lesson: `parse({ type: 'lesson', title: 'Intro' })` → title preserved
- Quiz: `parse({ ...validQuiz, title: 'Variables Quiz' })` → title preserved
- Reflection: `parse({ type: 'reflection', prompt: '...', title: 'My Reflection' })` → title preserved
- Exercise: `parse({ type: 'exercise', title: 'Practice' })` → title preserved
- Widget: `parse({ type: 'custom', widget: 'test', title: 'Custom Widget' })` → title preserved
- All: `parse({ ...node, title: 'a'.repeat(257) })` → throws (exceeds max)
- All: `parse({ ...node })` (no title) → succeeds (optional)

#### Acceptance Criteria

- [ ] All 5 node schemas accept `title` as an optional string
- [ ] `title` is present in the inferred `ContentNode` type
- [ ] `title` >256 chars is rejected
- [ ] Existing nodes without `title` still validate
- [ ] `pnpm --filter @open-edu/schemas test` passes
- [ ] `pnpm --filter @open-edu/schemas typecheck` passes

---

### Story 2: Extract title from markdown and preserve title in JSON nodes

**Package:** `@open-edu/core`
**Files:** `packages/core/src/nodes.ts`, `packages/core/src/nodes.test.ts`
**Depends on:** Story 1 (schema)

#### Objective

At load time, extract a human-readable title from every node:

- For `.md` files: parse the first `# Heading` from the raw content
- For `.json` files: the `title` field (if present) is now preserved through Zod validation

#### Implementation

In `packages/core/src/nodes.ts`:

1. Add a helper function:

```typescript
function extractTitle(content: string): string | undefined {
  const match = content.match(/^#\s+(.+)/m);
  return match?.[1]?.trim();
}
```

2. In `detectNodeType()`, for `.md` files:

```typescript
if (ext === '.md') {
  return { type: 'lesson', title: extractTitle(content) };
}
```

This produces `{ type: 'lesson', title: 'Introduction to Variables' }` which now validates against the updated `LessonNodeSchema`.

3. For `.json` files: no code change needed — `ContentNodeSchema.safeParse(parsed)` will now preserve `title` thanks to Story 1.

#### Tests (`packages/core/src/nodes.test.ts`)

- Lesson node from `.md` with `# Title`: verify `node.node.title === 'Title'`
- Lesson node from `.md` without `#`: verify `node.node.title` is undefined
- Lesson node from `.md` with multiline: verify only first `#` is used
- Quiz node from `.json` with `"title"`: verify `node.node.title` is preserved
- Quiz node from `.json` without `"title"`: verify `node.node.title` is undefined
- The existing `valid-package` lesson-01.md has `# Introduction to Variables` — update the existing test (line 40-41) to check `title` equals `"Introduction to Variables"`

#### Acceptance Criteria

- [ ] `.md` files with `# Heading` have `node.node.title` set to the heading text
- [ ] `.md` files without `# Heading` have `node.node.title` as undefined
- [ ] `.json` files with `"title"` have `node.node.title` preserved
- [ ] `.json` files without `"title"` have `node.node.title` as undefined
- [ ] `pnpm --filter @open-edu/core test` passes
- [ ] `pnpm --filter @open-edu/core typecheck` passes

---

### Story 3: Fix `getOrderedNodes` to exclude COMPLETED sentinel

**Package:** `@open-edu/workflow`
**Files:** `packages/workflow/src/topology.ts`, `packages/workflow/src/topology.test.ts`
**Depends on:** None

#### Objective

The `COMPLETED` sentinel value should never appear in the ordered node list returned by `getOrderedNodes()`.

#### Root Cause

In `topology.ts`, the BFS pushes routing targets (`onComplete` and `then`) into the queue unconditionally. When a target is `'COMPLETED'`, it gets dequeued, added to `result`, and only then does the lookup `workflow.routing['COMPLETED']` fail. The sentinel ends up as a step in the nav.

#### Implementation

In `packages/workflow/src/topology.ts`, BFS loop:

```typescript
if (route.onComplete && route.onComplete !== 'COMPLETED') {
  queue.push(route.onComplete);
}
```

And similarly for the conditions branch:

```typescript
for (const condition of route.conditions) {
  if (condition.then !== 'COMPLETED') {
    queue.push(condition.then);
  }
}
```

#### Tests (`packages/workflow/src/topology.test.ts`)

Add tests:

- `does not include COMPLETED sentinel in linear workflow` — workflow with `onComplete: 'COMPLETED'` → result does not contain `'COMPLETED'`
- `does not include COMPLETED sentinel in conditional workflow` — workflow where condition branches target `'COMPLETED'` → result does not contain `'COMPLETED'`
- `normal nodes still appear` — existing linear/conditional tests still pass
- `COMPLETED in middle of chain is excluded` — `a → b → COMPLETED → c` → result is `['a', 'b', 'c']`

#### Acceptance Criteria

- [ ] `getOrderedNodes` never includes `'COMPLETED'` in the result
- [ ] Existing BFS behavior (linear, conditional, cycle guard, diamond) is unchanged
- [ ] `pnpm --filter @open-edu/workflow test` passes

---

### Story 4: Update runtime UI to use typed `title`

**Package:** `@open-edu/runtime`, `apps/learner`
**Files:**

- `packages/runtime/src/layout/Sidebar.tsx`
- `packages/runtime/src/renderers/NodeRenderer.tsx`
- `packages/runtime/src/context/RuntimeContext.tsx`
- `packages/runtime/src/embed.tsx`
- `packages/runtime/src/embed.test.tsx` (if mock needs update)
- `apps/learner/src/AppShell.tsx`
- `apps/learner/src/ProgressDashboard.tsx`
  **Depends on:** Stories 1, 2

#### Objective

Remove all `(node.node as { title?: string }).title` type casts and use the typed `node.node.title` property. Replace raw path fallbacks with humanized versions.

#### Implementation

For each of the 6 consumer files, replace:

```typescript
// BEFORE
(node.node as { title?: string }).title ?? node.relativePath.replace('.md', '');

// AFTER
node.node.title ?? humanizeNodeId(node.relativePath);
```

Where `humanizeNodeId` strips the extension and replaces separators with spaces:

```typescript
function humanizeNodeId(nodeId: string): string {
  return nodeId.replace(/\.[^.]+$/, '').replace(/[-_/]/g, ' ');
}
```

Specific changes per file:

1. **`Sidebar.tsx:26`** — `node.node.title ?? node.relativePath.replace('.md', '')` → use `humanizeNodeId`
2. **`NodeRenderer.tsx:26`** — `node.node.title ?? node.relativePath` → same
3. **`RuntimeContext.tsx:248`** — `currentNode.node.title ?? currentNode.relativePath` → same
4. **`embed.tsx:91`** — `currentNode.node.title ?? currentNode.relativePath` → same
5. **`AppShell.tsx:279`** — `node.node.title ?? nodeId.replace('.md', '')` → use `humanizeNodeId`
6. **`ProgressDashboard.tsx:55`** — `(n.node as { title?: string }).title` → `n.node.title`
7. **`ProgressDashboard.tsx:109`** — `nodeTitleMap[snap.currentNodeId] ?? humanizeNodeId(snap.currentNodeId)` → this already has `humanizeNodeId`, just update the fallback in `nodeTitleMap` construction

Consider extracting `humanizeNodeId` into a shared utility in `@open-edu/runtime` (e.g., `packages/runtime/src/utils/strings.ts`) or keeping it inline — since it's a trivial function, inline is fine.

#### Tests

- **`Sidebar.test.tsx`** — already passes `title` in `makeNode` mock, no changes needed. Verify test output shows titles.
- **`embed.test.tsx`** — the mock at line 27 has `node: { type: 'lesson' }`. With the schema change, this is already valid (title is optional). No change needed unless we want to verify title announcement.

#### Acceptance Criteria

- [ ] No `(node.node as { title?: string })` casts remain in the codebase
- [ ] All 6 UI components read `node.node.title` as a typed property
- [ ] Fallback for missing titles is `humanizeNodeId(nodeId)` (strips ext + replaces separators with spaces)
- [ ] `pnpm --filter @open-edu/runtime test` passes
- [ ] `pnpm --filter @open-edu/runtime typecheck` passes

---

### Story 5: Add `title` to all example JSON node files

**Files:** 28 `.json` files across `examples/*/nodes/`
**Depends on:** Story 1 (schema), Story 2 (loading)

#### Objective

Every example JSON node file gets a meaningful `title` field so the left nav shows human-readable labels.

#### Title Mapping

Each file gets `"title"` based on its content. Here is the complete list:

| File (under `examples/`)                              | `type`     | Suggested `title`              |
| ----------------------------------------------------- | ---------- | ------------------------------ |
| `intro-javascript/nodes/variables-quiz.json`          | quiz       | "Variables Knowledge Check"    |
| `fractions/nodes/quiz.json`                           | quiz       | "Fraction Fundamentals Quiz"   |
| `autism-reading/nodes/quiz.json`                      | quiz       | "Park Story Comprehension"     |
| `autism-reading/nodes/reflection.json`                | reflection | "Your Park Experience"         |
| `adaptive-study/nodes/checkpoint.json`                | quiz       | "Adaptive Learning Checkpoint" |
| `adaptive-study/nodes/reflection.json`                | reflection | "Reflect on Adaptive Learning" |
| `living-vs-nonliving/nodes/observe.json`              | exercise   | "Observe Living Things"        |
| `living-vs-nonliving/nodes/guided-practice.json`      | exercise   | "Living vs Non-Living Match"   |
| `living-vs-nonliving/nodes/independent-practice.json` | exercise   | "Independent Practice"         |
| `living-vs-nonliving/nodes/mastery-check.json`        | exercise   | "Mastery Check: Living Things" |
| `skill-graph/nodes/quiz-basics.json`                  | quiz       | "Algebra Basics Quiz"          |
| `skill-graph/nodes/quiz-advanced.json`                | quiz       | "Advanced Algebra Quiz"        |
| `widget-practice/nodes/practice.json`                 | exercise   | "Widget Practice Exercise"     |
| `widget-showcase/nodes/visual-counting.json`          | exercise   | "Visual Counting"              |
| `widget-showcase/nodes/story-question.json`           | exercise   | "Story Question"               |
| `widget-showcase/nodes/real-world.json`               | exercise   | "Real World Application"       |
| `widget-showcase/nodes/sequencing.json`               | exercise   | "Life Cycle Sequencing"        |
| `widget-showcase/nodes/measurement-scale.json`        | exercise   | "Thermometer Reading"          |
| `widget-showcase/nodes/multiple-choice.json`          | exercise   | "General Knowledge Quiz"       |
| `widget-showcase/nodes/place-value-chart.json`        | exercise   | "Place Value Chart"            |
| `widget-showcase/nodes/matching.json`                 | exercise   | "Fruit Color Matching"         |
| `widget-showcase/nodes/grid-area.json`                | exercise   | "Grid Area Practice"           |
| `widget-showcase/nodes/fraction-visual.json`          | exercise   | "Fraction Shading"             |
| `widget-showcase/nodes/drag-drop.json`                | exercise   | "Habitat Sort"                 |
| `widget-showcase/nodes/clock-time.json`               | exercise   | "Clock Time Practice"          |
| `widget-showcase/nodes/fill-blank.json`               | exercise   | "Water Cycle Sentences"        |
| `widget-showcase/nodes/chart-reader.json`             | exercise   | "Chart Reading"                |
| `remote-widget-demo/nodes/remote-practice.json`       | custom     | "Remote Practice Questions"    |

The two `level-b-math` files (`mastery_check.json`, `guided_practice.json`) already have `"title"` — no changes needed.

#### Verification

Run `pnpm --filter @open-edu/core test` and verify all example packages load without validation errors. The `title` fields should now be preserved through Zod validation.

#### Acceptance Criteria

- [ ] Every example JSON node file has a `"title"` field
- [ ] `pnpm --filter @open-edu/core test` passes (loader tests use examples)
- [ ] `pnpm --filter @open-edu/core exec vitest run --reporter verbose` shows no loading errors

---

### Story 6: Emit `title` in course-compiler generated quiz JSON

**Package:** `@open-edu/course-compiler`
**Files:** `packages/course-compiler/src/generators/package-generator.ts`, `packages/course-compiler/src/generators/package-generator.test.ts`
**Depends on:** Story 1 (schema)

#### Objective

The course-compiler's `generateQuizJson()` should include the quiz title in its output so that compiled courses show human-readable step titles.

#### Implementation

In `packages/course-compiler/src/generators/package-generator.ts`, update `generateQuizJson()` (around line 200-226):

```typescript
function generateQuizJson(quiz: Quiz): Record<string, unknown> {
  if (quiz.questions.length > 0) {
    const firstQuestion = quiz.questions[0]!;
    if (firstQuestion.type === 'multiple-choice') {
      return {
        type: 'quiz',
        title: quiz.title, // ← ADD THIS
        question: firstQuestion.prompt,
        options: firstQuestion.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          correct: opt.correct,
        })),
        skills: [],
      };
    }
  }
  return {
    type: 'quiz',
    title: quiz.title, // ← ADD THIS
    question: quiz.title,
    options: [
      { id: 'a', text: 'Answer A', correct: true },
      { id: 'b', text: 'Answer B', correct: false },
    ],
    skills: [],
  };
}
```

The `quiz.title` field already exists in the course-compiler's internal `Quiz` schema (`course-model.ts:178`).

#### Tests (`packages/course-compiler/src/generators/package-generator.test.ts`)

- Update the test that verifies quiz JSON output (around line 120-140): add `title: '...'` to the expected output
- Add test: generated quiz JSON includes `title` matching the source quiz title
- Verify the existing E2E test (`e2e.test.ts`) still passes with generated output containing `title`

#### Acceptance Criteria

- [ ] Generated quiz JSON files include `"title"` field
- [ ] The `title` value comes from `quiz.title` in the course spec
- [ ] `pnpm --filter @open-edu/course-compiler test` passes
- [ ] E2E compile + validate flow works: `pnpm --filter @open-edu/course-compiler exec vitest run src/e2e.test.ts`

---

### Story 7: Update docs and agent prompt

**Files:**

- `packages/core/src/agent-prompt.ts`
- `apps/docs/docs/package-format.md`
- `apps/docs/docs/package-authoring.md`
  **Depends on:** Story 1 (schema)

#### Objective

Document the new optional `title` field in all places where node schemas are described.

#### Implementation

1. **`packages/core/src/agent-prompt.ts`** (lines 93-146) — Add `"title": "string (max 256)"` to every node type's documented schema:

For each of the 5 node types (lesson, quiz, reflection, exercise, custom), add after `"skills"`:

```
"title": "string (max 256)",       // optional — display name shown in nav
```

2. **`apps/docs/docs/package-format.md`** — In each JSON code example block (lines 73-150), add `"title"` as an optional field:

```json
{
  "type": "quiz",
  "title": "Knowledge Check",      // optional — shown in course nav
  "question": "...",
  "options": [...]
}
```

Apply to all 5 node type examples (quiz, reflection, exercise, custom with remote widget, exercise with skills).

3. **`apps/docs/docs/package-authoring.md`** — Same treatment for the code examples (lines 65-134).

#### Acceptance Criteria

- [ ] `agent-prompt.ts` documents `title` on all 5 node types
- [ ] `package-format.md` shows `title` in all example blocks
- [ ] `package-authoring.md` shows `title` in all example blocks

---

### Story 8: Update test fixtures

**Files:** `packages/core/src/__fixtures__/valid-package/nodes/quiz-01.json`, `packages/core/src/__fixtures__/valid-package/nodes/reflection-01.json`
**Depends on:** Story 1 (schema)

#### Objective

Add `title` fields to fixture JSON node files used by loader tests so they reflect the expected format.

#### Implementation

- `quiz-01.json`: add `"title": "Variables Quiz"`
- `reflection-01.json`: add `"title": "Learning Reflection"`

Update any test assertions that compare the parsed node object to include the `title` field.

#### Acceptance Criteria

- [ ] Fixture files include `title`
- [ ] `pnpm --filter @open-edu/core test` passes
