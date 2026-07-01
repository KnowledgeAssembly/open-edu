# Epic: Visual & Engaging Pipeline Output

**Epic ID:** `VIS-EPIC`
**Target AI:** deepseek-4-flash (or any agent implementing independently)
**Convention:** Each story is self-contained. Read the "Context" section first, then implement.
**Verify:** `pnpm build && pnpm test && pnpm lint && pnpm typecheck` after each story.

---

## Objective

Transform the auto-generated course pipeline from producing plain-text lessons to generating visually rich, interactive educational content. The LLM-driven pipeline will choose appropriate widgets per activity, and the output format will support both human-readable markdown and machine-consumable JSON.

## Problem Statement

The current pipeline (`packages/pipeline/`) generates course-spec.md files with 5 text-only activities per concept (observe → guided_practice → independent_practice → mastery_check → positive_completion). None of the LLM prompts ask for images, diagrams, tables, or interactive elements. The `supports.visual` field on `GeneratedConcept` is populated during concept enrichment but never used downstream.

Meanwhile, the OpenEdu runtime already supports 14 interactive widgets, Markdown images/tables, and 6 themes — but the pipeline never generates any of these.

## Design Decisions

1. **LLM chooses the widget, not code** — Instead of hardcoding widget-to-concept mappings in `type-selector.ts`, each LLM prompt describes available widgets and lets the LLM decide. This scales to new subjects and widgets without code changes.
2. **JSON output alongside markdown** — Widget configs are complex nested objects. Embedding them in markdown fenced blocks is brittle. The pipeline outputs both `course-spec.md` (human view) and `course-spec.json` (canonical structured data). The course-compiler reads JSON directly.
3. **Widget config validation at pipeline level** — After the LLM emits a widget config, the pipeline validates it against the widget's own Zod schema. Invalid configs fall back to a `reading` activity. This prevents malformed configs from reaching the course-compiler.
4. **Widget activity = exercise node** — In the compiled package, widget activities become JSON nodes with `{ type: "exercise", widget: "...", config: {...} }`. The runtime already handles this format — no runtime changes needed.
5. **Type-selector deleted** — Once the LLM chooses types dynamically, the hardcoded `type-selector.ts` is obsolete.

## Impact Map

| Area | Impact | Action |
|------|--------|--------|
| `packages/pipeline/src/types.ts` | Low | Add `widget` type to `CourseSpecActivityType` + `widgetId`/`widgetConfig` to `GeneratedActivity` |
| `packages/pipeline/src/generate-activities/prompts/observe.ts` | High | Add visual instructions + widget catalog |
| `packages/pipeline/src/generate-activities/prompts/guided-practice.ts` | High | Same |
| `packages/pipeline/src/generate-activities/prompts/independent-practice.ts` | High | Same |
| `packages/pipeline/src/generate-activities/prompts/mastery-check.ts` | Medium | Add scenario-based questions format |
| `packages/pipeline/src/generate-activities/prompts/positive-completion.ts` | Medium | Add real-world visual activity suggestions |
| `packages/pipeline/src/generate-activities/exemplars.ts` | Medium | Add visual/widget exemplars |
| `packages/pipeline/src/generate-activities/index.ts` | High | Add `widget` type handling + validation |
| `packages/pipeline/src/generate-activities/type-selector.ts` | High | **Delete** this file |
| `packages/pipeline/src/output/index.ts` | High | Add `renderCourseSpecJSON()` function |
| `packages/pipeline/src/cli/index.ts` | Low | Add `--format` flag |
| `packages/pipeline/src/graph/index.ts` | Low | Write JSON output, update report |
| `packages/course-compiler/src/schemas/course-model.ts` | Medium | Add `WidgetActivitySchema` |
| `packages/course-compiler/src/parser/json-input.ts` | High | **New file** — parse course-spec.json |
| `packages/course-compiler/src/parser/index.ts` | Low | Export JSON parser |
| `packages/course-compiler/src/cli/index.ts` | Low | Detect `.json` input |
| `packages/course-compiler/src/generators/package-generator.ts` | Medium | Generate widget JSON node |

## Dependent Stories

| Story | Description | Depends On | Effort |
|-------|-------------|------------|--------|
| VIS-01 | Add `widget` type to pipeline types | — | Small |
| VIS-02 | Update LLM prompts with widget catalog + visual instructions | VIS-01 | Medium |
| VIS-03 | Add widget content schema + validation to activity generator | VIS-01 | Medium |
| VIS-04 | Delete `type-selector.ts` (LLM now chooses type) | VIS-02, VIS-03 | Small |
| VIS-05 | Add JSON output renderer to pipeline | VIS-01 | Medium |
| VIS-06 | Wire JSON output into CLI + graph | VIS-05 | Small |
| VIS-07 | Add WidgetActivitySchema to course-compiler | — | Small |
| VIS-08 | Create JSON input parser for course-compiler | VIS-07 | Medium |
| VIS-09 | Auto-detect `.json` input in course-compiler CLI | VIS-08 | Small |
| VIS-10 | Generate widget JSON nodes in package-generator | VIS-08 | Small |
| VIS-11 | Build exemplars + test the full pipeline | VIS-04, VIS-06, VIS-10 | Medium |
| VIS-12 | Markdown output renders widget badge (instead of raw JSON) | VIS-05 | Small |

---

## Story VIS-01: Add `widget` type to pipeline types

**Package:** `@open-edu/pipeline`
**Files:** `packages/pipeline/src/types.ts`
**Depends on:** None
**Estimated effort:** Small (15 min)

### Objective

Add `widget` as a valid course spec activity type so the LLM can output widget-based activities. Add `widgetId` and `widgetConfig` fields to `GeneratedActivity` and `ActivityContent`.

### Context

Currently `COURSE_SPEC_TYPES = ['reading', 'exercise', 'quiz', 'reflection']`. The LLM can only emit these types. To support widgets, we need to add `'widget'` and carry the widget selection through the data structures.

### Implementation

In `packages/pipeline/src/types.ts`:

1. Add `'widget'` to `COURSE_SPEC_TYPES`:
```typescript
export const COURSE_SPEC_TYPES = ['reading', 'exercise', 'quiz', 'reflection', 'widget'] as const;
```

2. Add optional fields to `GeneratedActivity`:
```typescript
export interface GeneratedActivity {
  step: ActivityStep;
  courseSpecType: CourseSpecActivityType;
  order: number;
  content: ActivityContent;
  /** Only set when courseSpecType === 'widget'. The widget ID (e.g. "open-edu.matching") */
  widgetId?: string;
  /** Only set when courseSpecType === 'widget'. The widget config object, validated against the widget's Zod schema */
  widgetConfig?: Record<string, unknown>;
}
```

3. Add optional fields to `ActivityContent`:
```typescript
export interface ActivityContent {
  description: string;
  instructions?: string;
  examples?: string[];
  hints?: string[];
  questions?: MCQQuestion[];
  /** Widget config for widget-type activities. Copied from GeneratedActivity.widgetConfig for convenience. */
  widgetConfig?: Record<string, unknown>;
}
```

### Tests

Add to `packages/pipeline/src/__tests__/types.test.ts` (create if not exists):

1. `COURSE_SPEC_TYPES.includes('widget')` is true
2. A `GeneratedActivity` with `courseSpecType: 'widget'` and `widgetId: 'open-edu.matching'` type-checks
3. A `GeneratedActivity` with `courseSpecType: 'reading'` and NO `widgetId` type-checks

### Acceptance

- `pnpm --filter @open-edu/pipeline typecheck` passes
- `pnpm --filter @open-edu/pipeline test` passes
- `pnpm --filter @open-edu/pipeline lint` passes

---

## Story VIS-02: Update LLM prompts with widget catalog + visual instructions

**Package:** `@open-edu/pipeline`
**Files:**
- `packages/pipeline/src/generate-activities/prompts/observe.ts`
- `packages/pipeline/src/generate-activities/prompts/guided-practice.ts`
- `packages/pipeline/src/generate-activities/prompts/independent-practice.ts`
- `packages/pipeline/src/generate-activities/prompts/mastery-check.ts`
- `packages/pipeline/src/generate-activities/prompts/positive-completion.ts`

**Depends on:** VIS-01
**Estimated effort:** Medium (2-3 hours)

### Objective

Update each LLM prompt to: (a) include rich visual instructions (tables, image references, structured formatting), and (b) present a widget catalog so the LLM can choose to output `type: "widget"` instead of plain `reading`/`exercise`.

### Context

The current prompts hardcode the output type (e.g., `observe.ts` says `"type": "reading"`). We want the LLM to choose dynamically: either plain text (`reading`, `exercise`) or a visual widget (`widget`). The prompts need to describe available widgets clearly enough for the LLM to make a good choice and generate valid configs.

### Implementation

#### Shared widget catalog (add near top of each prompt)

Each prompt should start with a shared section describing available widgets:

> ## Available Widgets
> You may output `type: "reading"`, `type: "exercise"`, or `type: "widget"` with a `widgetId` + `widgetConfig`. Choose `widget` when the concept has visual or interactive potential.
>
> ### Widget List
> | Widget ID | Best For | Key Config |
> |-----------|----------|------------|
> | `open-edu.matching` | Matching terms to definitions, concept pairs | `pairs[{itemA, itemB}]` |
> | `open-edu.drag-drop` | Sorting items into categories | `items[{id,label}]`, `targets[{id,label}]`, `expectedPositions` |
> | `open-edu.story-question` | Narrative/scenario-based comprehension | `scenario`, `questions[{question,options,correctIndex}]` |
> | `open-edu.fraction-visual` | Parts of a whole, fractions | `numerator`, `denominator`, `mode: "bar"\|"circle"` |
> | `open-edu.chart-reader` | Bar charts and pictographs | `type: "bar"\|"pictograph"`, `data[{label,value}]` |
> | `open-edu.clock-time` | Reading/setting clocks | `hour`, `minute`, `mode: "read"\|"set"` |
> | `open-edu.measurement-scale` | Measuring with ruler/thermometer/cylinder | `type`, `min`, `max`, `step`, `unit` |
> | `open-edu.place-value-chart` | Place value (Indian system) | `maxPlaces: "lakh"\|"crore"`, `targetNumber` |
> | `open-edu.grid-area` | Area/perimeter counting | `rows`, `cols`, `mode: "area"\|"perimeter"` |
> | `open-edu.visual-counting` | Counting objects, simple addition | `count`, `emoji` or `items[]` |
> | `open-edu.fill-blank` | Fill-in-the-blank exercises | `template` (with `___` blanks), `blanks[]` |
> | `open-edu.sequencing` | Ordering steps or events | `items[{id,label}]`, `correctOrder[id]` |
> | `open-edu.real-world` | Real-world scenario + self-assessment | `scenario`, `taskDescription` |
> | `open-edu.multiple-choice` | Multiple choice quiz | `questions[{question,options[],correctIndex}]` |
>
> ### Widget Output Format
> When choosing a widget, output:
> ```json
> { "type": "widget", "content": { "description": "...", "instructions": "..." },
>   "widgetId": "open-edu.matching",
>   "widgetConfig": { ... widget-specific config fields ... } }

#### Per-step customizations

**`observe.ts`:**
- Change the description: "The observe step is the first activity. Show, don't just tell."
- Add: "Prefer `type: "widget"` with `interactive: false` for concepts with visual potential (fractions, charts, clocks, measurements, family structures). This lets learners see the visual before interacting."
- Add: "If generating text output (`type: "reading"`), use tables for comparisons, `![Diagram description](concept-id)` for image references, **bold** for key terms, and bullet hierarchies for structured content."
- Remove the hardcoded type/format constraint — replace with the flexible format.

**`guided-practice.ts` & `independent-practice.ts`:**
- Add: "Prefer `type: "widget"` with `interactive: true` for concepts where learners can practice by dragging, matching, sorting, sequencing, or filling blanks."
- Add: "Include `interactive: true` and optional `hints[]` in the widgetConfig for guided practice. For independent practice, omit hints."
- Add: "If generating text output, use tables for structured problems, `![Diagram](concept-id)` for visual references."

**`mastery-check.ts`:**
- Keep MCQ but add: "Include at least 1 scenario-based question (present a real-world situation, then ask a question about it)."
- Add: "Each question can optionally include an `explanation` field shown after answering."

**`positive-completion.ts`:**
- Add: "Suggest a specific real-world visual activity the learner can do (e.g., 'Draw a family tree', 'Create a bar chart of your weekly schedule')."

### Output format per prompt

Update the "Output Requirements" section of each prompt to be flexible:

```json
{
  "type": "reading" | "exercise" | "widget",
  "content": {
    "description": "Short title for this activity",
    "instructions": "Main content text (markdown format, can include tables, images, etc.)",
    "examples": ["Optional example 1", "Optional example 2"]
  },
  // Only when type === "widget":
  "widgetId": "open-edu.matching",
  "widgetConfig": { ... }
}
```

**Important**: The `content.instructions` field should be present for ALL types (reading, exercise, widget) as a fallback display string. For widget types, it's shown as a description above the widget.

### Tests

No automated tests for prompt text alone. **Manual verification:**

1. Run `pnpm --filter @open-edu/pipeline build`
2. Visually inspect that all 5 prompt files export their string constants without syntax errors

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- Each prompt file contains the widget catalog table
- Each prompt no longer hardcodes a single `type`
- `observe.ts` defaults to preferring `widget` with `interactive: false` for visual concepts

---

## Story VIS-03: Add widget content schema + validation to activity generator

**Package:** `@open-edu/pipeline`
**Files:** `packages/pipeline/src/generate-activities/index.ts`
**Depends on:** VIS-01
**Estimated effort:** Medium (2 hours)

### Objective

Update `generateStep()` to accept `type: "widget"` output from the LLM, validate the widget config against the corresponding widget's Zod schema, and fall back to `reading` if validation fails.

### Context

The current `stepOutputSchema()` only handles `reading`, `exercise`, `quiz`, and `reflection`. The activity generator calls the LLM with a prompt, parses the JSON response against the schema, and creates a `GeneratedActivity`. We need to add `widget` handling.

For validation, each widget in `@open-edu/widgets` exports a Zod config schema. We need to look up the schema by `widgetId`, parse the `widgetConfig` against it, and reject if invalid.

### Implementation

#### 1. Create a widget schema registry

Create `packages/pipeline/src/generate-activities/widget-schemas.ts`:

```typescript
import { fractionVisualSchema } from '@open-edu/widgets/builtins/FractionVisual';
import { clockTimeSchema } from '@open-edu/widgets/builtins/ClockTime';
// ... import other widget schemas

// Note: You may need to check exact export names in each widget's source file.
// Look in packages/widgets/src/builtins/<WidgetName>/ for the schema export.
// If the schema is not exported, import the WidgetDefinition and extract its configSchema.

const widgetSchemaRegistry = new Map<string, z.ZodType>();

export function registerWidgetSchema(widgetId: string, schema: z.ZodType): void {
  widgetSchemaRegistry.set(widgetId, schema);
}

export function getWidgetSchema(widgetId: string): z.ZodType | undefined {
  return widgetSchemaRegistry.get(widgetId);
}
```

**Verification**: Check each widget in `packages/widgets/src/builtins/` for its config schema export. If a widget's schema is not exported, the widget definition's `configSchema` field can be accessed from the widget definition object (check the widget's source file for its `WidgetDefinition`).

Note: Some widgets may use internal schemas not exported from the package. For those, define a loose schema (e.g., `z.record(z.unknown())`) or skip validation for that particular widget. The priority is getting the system working — schema fidelity can be improved later.

#### 2. Update `stepOutputSchema()` — add `widget` case

```typescript
function stepOutputSchema(type: string): z.ZodType {
  switch (type) {
    case 'reading':
      return z.object({ type: z.literal('reading'), content: readingContentSchema });
    case 'exercise':
      return z.object({ type: z.literal('exercise'), content: exerciseContentSchema });
    case 'quiz':
      return z.object({ type: z.literal('quiz'), content: quizContentSchema });
    case 'reflection':
      return z.object({ type: z.literal('reflection'), content: reflectionContentSchema });
    case 'widget':
      return z.object({
        type: z.literal('widget'),
        widgetId: z.string().min(1),
        widgetConfig: z.record(z.unknown()),
        content: readingContentSchema, // description + instructions as fallback
      });
    default:
      throw new Error(`Unknown activity type: ${type}`);
  }
}
```

#### 3. Update `generateStep()` — add widget config validation

After the LLM returns a `widget`-type result, validate the config:

```typescript
// Inside generateStep(), after getting LLM result:
if (type === 'widget') {
  const widgetSchema = getWidgetSchema(result.widgetId as string);
  if (widgetSchema) {
    const parseResult = widgetSchema.safeParse(result.widgetConfig);
    if (!parseResult.success) {
      // If it's the last attempt, fall back to reading type
      if (attempt < maxRetries) {
        lastErrors = [`Widget '${result.widgetId}' config validation failed: ${parseResult.error.message}`];
        lastAttempt = result;
        continue; // retry
      }
      // Fall back to reading type
      logger.warn(`Widget config invalid for ${result.widgetId}, falling back to reading`);
      type = 'reading';
      result.type = 'reading';
      // result.content already has readingContentSchema data, continue
    } else {
      result.widgetConfig = parseResult.data;
    }
  }
}
```

#### 4. Update `contentToActivityContent()` — handle widget type

```typescript
function contentToActivityContent(type: string, content: Record<string, unknown>, widgetId?: string, widgetConfig?: Record<string, unknown>): ActivityContent {
  const base = {
    description: content.description as string,
    instructions: content.instructions as string,
    examples: content.examples as string[] | undefined,
  };
  if (type === 'widget') {
    return {
      ...base,
      widgetConfig: widgetConfig,
    };
  }
  if (type === 'quiz') {
    // existing quiz handling
  }
  return base;
}
```

#### 5. Update the call to pass widget data

Update the `GeneratedActivity` construction in `generateStep()`:

```typescript
const activity: GeneratedActivity = {
  step: step as GeneratedActivity['step'],
  courseSpecType: type as GeneratedActivity['courseSpecType'],
  order,
  content: contentToActivityContent(type, result.content as Record<string, unknown>, 
    result.widgetId as string | undefined, result.widgetConfig as Record<string, unknown> | undefined),
  widgetId: type === 'widget' ? result.widgetId as string : undefined,
  widgetConfig: type === 'widget' ? result.widgetConfig as Record<string, unknown> : undefined,
};
```

### Tests

Create `packages/pipeline/src/generate-activities/__tests__/widget-schemas.test.ts`:

1. **Widget schema registry**: `registerWidgetSchema('test', z.object({ x: z.number() }))` then `getWidgetSchema('test')` returns the schema.
2. **Widget output accepted**: LLM returns valid widget output → `GeneratedActivity` has `courseSpecType: 'widget'` and `widgetId` is set.
3. **Widget config invalid → retry**: LLM returns widget with bad config → system retries or falls back to reading (mock the LLM to return invalid first, then valid).
4. **Widget config invalid → reading fallback**: When all retries exhausted with invalid config → `GeneratedActivity` has `courseSpecType: 'reading'`.

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- `pnpm --filter @open-edu/pipeline test` passes
- Widget config validation catches invalid configs
- Invalid widget configs degrade gracefully to reading type

---

## Story VIS-04: Delete `type-selector.ts`

**Package:** `@open-edu/pipeline`
**Files:**
- `packages/pipeline/src/generate-activities/type-selector.ts` — **DELETE**
- `packages/pipeline/src/generate-activities/index.ts` — **EDIT** (remove imports and references)

**Depends on:** VIS-02, VIS-03
**Estimated effort:** Small (10 min)

### Objective

Remove the hardcoded type-mapping logic now that the LLM selects types dynamically.

### Context

`type-selector.ts` maps each step to a single hardcoded type:
- observe → reading
- guided_practice → exercise
- independent_practice → exercise
- mastery_check → quiz
- positive_completion → reflection

After VIS-02 and VIS-03, the LLM prompt for each step includes the widget catalog and the LLM chooses `reading`, `exercise`, or `widget` per-concept, per-step. The hardcoded mapping is dead code.

### Implementation

1. **Delete** `packages/pipeline/src/generate-activities/type-selector.ts`

2. **Edit** `packages/pipeline/src/generate-activities/index.ts`:
   - Remove the import: `import { selectTypesForConcept } from './type-selector.js';`
   - Remove the reference in `generateActivitiesForConcept()`:
     - Remove `const types = selectTypesForConcept(concept);`
     - Replace with: the step's type should come from... where?

**Note**: We need a temporary fallback mechanism. Not every step prompt may be updated to handle dynamic types immediately. Add a simple default map:

```typescript
const DEFAULT_TYPES: Record<string, string> = {
  observe: 'reading',
  guided_practice: 'exercise',
  independent_practice: 'exercise',
  mastery_check: 'quiz',
  positive_completion: 'reflection',
};
```

The `generateStep()` function should still accept a `type` parameter. The caller (`generateActivitiesForConcept`) now uses `DEFAULT_TYPES[step]` as the initial type, but the LLM can override it in its response.

Wait — actually, the flow is:
1. `generateActivitiesForConcept` calls `generateStep(step, type, concept, ...)` 
2. `generateStep` passes the prompt which includes the widget catalog
3. The LLM responds with its chosen type

So the `type` parameter passed to `generateStep` is the **initial type** but the LLM can return a **different type** in its response. Let's make it so:

```typescript
// In generateActivitiesForConcept:
for (let i = 0; i < STEP_ORDER.length; i++) {
  const step = STEP_ORDER[i]!;
  const type = DEFAULT_TYPES[step]!; // initial/default type
  
  const result = await generateStep(llm, step, type, concept, i + 1, MAX_RETRIES, validationErrors);
  // result.activity.courseSpecType may differ from type if LLM chose differently
  // ...
}
```

And in `generateStep`, the prompt should tell the LLM: "The default type for this step is `{type}`. You may choose a different type (`reading`, `exercise`, `widget`) if it better suits the concept."

After the LLM responds, use `parsedResult.type` instead of the passed `type`:

```typescript
const responseType = result.type as string; // LLM-chosen type
const activity: GeneratedActivity = {
  courseSpecType: responseType as GeneratedActivity['courseSpecType'],
  // ...
};
```

### Tests

1. Existing tests should still pass (they mock the LLM, which should now return valid type-aware responses).
2. Update any test fixtures that referenced `selectTypesForConcept` or `type-selector.ts`.

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- `pnpm --filter @open-edu/pipeline test` passes
- `type-selector.ts` is deleted (not in git)
- No remaining imports of `selectTypesForConcept` or `selectTypeForStep`

---

## Story VIS-05: Add JSON output renderer to pipeline

**Package:** `@open-edu/pipeline`
**Files:** `packages/pipeline/src/output/index.ts`
**Depends on:** VIS-01
**Estimated effort:** Medium (2 hours)

### Objective

Add a `renderCourseSpecJSON()` function that serializes `ConceptActivityPair[]` to a structured JSON schema, preserving widget configs as first-class nested objects instead of encoding them in markdown.

### Context

The current `renderCourseSpec()` produces a markdown string. Widget configs are complex nested objects that don't render well in markdown. We need a JSON format that:
- Carries all the same content as the markdown (metadata, lesson text, quiz questions)
- Carries widget configs as native JSON objects
- Can be read by the course-compiler's JSON input parser (VIS-08)
- Is self-contained (no external references)

### Implementation

Add the following to `packages/pipeline/src/output/index.ts`:

```typescript
// ---- JSON output types ----

export interface CourseSpecJSON {
  format: 'openedu-course-spec';
  version: 1;
  generatedAt: string; // ISO timestamp
  metadata: {
    title: string;
    description: string;
    author?: string;
    version?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    estimatedHours?: number;
    generated: boolean;
  };
  lessons: CourseSpecLessonJSON[];
}

export interface CourseSpecLessonJSON {
  id: string;
  title: string;
  objectives: string[];
  coreIdea: string;
  examples: string[];
  misconceptions: string[];
  estimatedMinutes?: number;
  activities: CourseSpecActivityJSON[];
}

export interface CourseSpecActivityJSON {
  step: 'observe' | 'guided_practice' | 'independent_practice' | 'mastery_check' | 'positive_completion';
  order: number;
  type: 'reading' | 'exercise' | 'quiz' | 'reflection' | 'widget';
  description: string;
  instructions?: string;
  examples?: string[];
  questions?: MCQQuestion[];
  /** Only for widget type */
  widgetId?: string;
  /** Only for widget type */
  widgetConfig?: Record<string, unknown>;
}
```

```typescript
export function renderCourseSpecJSON(pairs: ConceptActivityPair[]): CourseSpecJSON {
  const first = pairs[0]?.concept;
  const estimatedHours = pairs.reduce((sum, p) => sum + (p.concept.estimatedDuration || 15), 0) / 60;
  
  const difficulty = pairs.some((p) => p.concept.difficulty === 'advanced')
    ? 'advanced'
    : pairs.some((p) => p.concept.difficulty === 'intermediate')
      ? 'intermediate'
      : 'beginner';
  
  const title = first?.chapterName
    ? `${first.chapterName} — Auto-generated Course`
    : 'Auto-generated Course';
  
  const lessons: CourseSpecLessonJSON[] = [];
  
  // Each concept becomes a lesson
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i]!;
    const lessonNum = 101 + i; // sequential lesson numbering
    const lessonId = `lesson-${lessonNum}`;
    
    lessons.push({
      id: lessonId,
      title: pair.concept.learningObjective,
      objectives: [pair.concept.learningObjective],
      coreIdea: pair.concept.coreIdea,
      examples: pair.concept.examples,
      misconceptions: pair.concept.misconceptions,
      estimatedMinutes: pair.concept.estimatedDuration,
      activities: pair.activities.map((act) => ({
        step: act.step,
        order: act.order,
        type: act.courseSpecType,
        description: act.content.description,
        instructions: act.content.instructions,
        examples: act.content.examples,
        questions: act.content.questions,
        widgetId: act.widgetId,
        widgetConfig: act.widgetConfig,
      })),
    });
  }
  
  return {
    format: 'openedu-course-spec',
    version: 1,
    generatedAt: new Date().toISOString(),
    metadata: {
      title,
      description: `Auto-generated from ${pairs.length} concepts`,
      author: 'OpenEdu Pipeline',
      version: '1.0.0',
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      estimatedHours: Math.max(1, Math.round(estimatedHours)),
      generated: true,
    },
    lessons,
  };
}
```

Also add the write function:

```typescript
export function writeCourseSpecJSONOutput(
  outputDir: string,
  filenamePrefix: string,
  pairs: ConceptActivityPair[],
  force: boolean,
): { filePath: string; concepts: number } {
  const content = renderCourseSpecJSON(pairs);
  const filename = `${filenamePrefix}course-spec.json`;
  const jsonStr = JSON.stringify(content, null, 2);
  const filePath = writeCourseSpec(outputDir, filename, jsonStr, force);
  return { filePath, concepts: pairs.length };
}
```

Note: The existing `writeCourseSpec()` function writes a string to a file. It works for both markdown and JSON since it just writes a string.

### Tests

Create `packages/pipeline/src/output/__tests__/json-output.test.ts`:

1. **Renders metadata correctly**: Create mock pairs, call `renderCourseSpecJSON()`, verify `metadata.title`, `metadata.generated`, `metadata.estimatedHours`.
2. **Renders lessons list**: Verify `lessons` array has correct length.
3. **Preserves widget configs**: Create a pair with a widget activity (`widgetId: 'open-edu.matching'`, `widgetConfig: { pairs: [...] }`), verify the JSON has those fields.
4. **Preserves text activities**: Create a pair with a reading activity, verify `type: 'reading'` and `instructions` is present.
5. **Preserves quiz questions**: Create a pair with a quiz, verify `questions` array is present with correct shape.
6. **GeneratedAt is ISO timestamp**: `generatedAt` matches ISO 8601 format.

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- `pnpm --filter @open-edu/pipeline test` passes
- `renderCourseSpecJSON` output is valid JSON (verified by test)
- Widget configs are preserved verbatim (not flattened or stringified)

---

## Story VIS-06: Wire JSON output into CLI + graph

**Package:** `@open-edu/pipeline`
**Files:**
- `packages/pipeline/src/cli/index.ts`
- `packages/pipeline/src/graph/index.ts`

**Depends on:** VIS-05
**Estimated effort:** Small (30 min)

### Objective

Add `--format` CLI flag and write the JSON output alongside the markdown output in the pipeline.

### Context

The pipeline currently only writes `course-spec.md`. We need it to also (or alternatively) write `course-spec.json`. The CLI should support a `--format` flag: `both` (default), `md`, `json`.

### Implementation

#### 1. Update `packages/pipeline/src/cli/index.ts`

Add `--format` flag to `CLIOptions`:

```typescript
interface CLIOptions {
  // ... existing fields
  format: 'md' | 'json' | 'both';
}
```

Default value: `'both'`

Add parsing in `parseArgs()`:

```typescript
case '--format':
  const val = args[++i] || 'both';
  if (!['md', 'json', 'both'].includes(val)) {
    console.error(`Invalid format: ${val}. Use md, json, or both.`);
    process.exit(1);
  }
  options.format = val as 'md' | 'json' | 'both';
  break;
```

Add to help text:

```
  --format <type>       Output format: md, json, both (default: both)
```

#### 2. Update `packages/pipeline/src/graph/index.ts`

Update `PipelineOptions`:

```typescript
export interface PipelineOptions {
  // ... existing fields
  format: 'md' | 'json' | 'both';
}
```

Update the pipeline config in `runPipelineCLI()`:

```typescript
const report: PipelineReport = await runPipeline(llm, {
  // ... existing fields
  format: options.format,
});
```

Update step 6 in `runPipeline()`:

```typescript
// 6. Write output
let filePaths: string[] = [];

if (!options.dryRun) {
  log(options.verbose, '\n[6/6] Writing output...');
  
  try {
    if (options.format === 'md' || options.format === 'both') {
      const result = writeCourseSpecOutput(
        options.outputDir,
        `${options.levelCode?.toLowerCase() || ''}-${options.subject || ''}-`,
        validated.passed,
        options.force,
      );
      filePaths.push(result.filePath);
      log(options.verbose, `  ✓ Markdown: ${result.concepts} concepts written`);
    }
    
    if (options.format === 'json' || options.format === 'both') {
      const result = writeCourseSpecJSONOutput(
        options.outputDir,
        `${options.levelCode?.toLowerCase() || ''}-${options.subject || ''}-`,
        validated.passed,
        options.force,
      );
      filePaths.push(result.filePath);
      log(options.verbose, `  ✓ JSON: ${result.concepts} concepts written`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`File writing failed: ${msg}`);
    log(options.verbose, `  ✗ ${msg}`);
  }
}
```

Update `PipelineReport`:

```typescript
export interface PipelineReport {
  // ... existing fields
  outputPaths: string[]; // already exists but may need widening
}
```

The `outputPaths` field already exists as `string[]`. The report should now contain both file paths.

### Tests

No new tests needed for CLI wiring alone. The JSON output renderer tests (VIS-05) cover correctness.

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- Running with `--format json` produces only `.json` file
- Running with `--format both` (default) produces both `.md` and `.json` files
- Running with `--format md` produces only `.md` file (existing behavior)

---

## Story VIS-07: Add WidgetActivitySchema to course-compiler

**Package:** `@open-edu/course-compiler`
**Files:** `packages/course-compiler/src/schemas/course-model.ts`
**Depends on:** None
**Estimated effort:** Small (15 min)

### Objective

Add a `WidgetActivitySchema` to the course-compiler's activity model so widget-type activities can be parsed and validated.

### Context

The course-compiler's `ActivitySchema` is a discriminated union of `ReadingActivitySchema`, `ExerciseActivitySchema`, `DiscussionActivitySchema`, `ReflectionActivitySchema`, and `VideoActivitySchema`. We need to add `WidgetActivitySchema` to represent widget-based activities from the JSON input.

### Implementation

In `packages/course-compiler/src/schemas/course-model.ts`:

Add after the `VideoActivitySchema` block:

```typescript
export const WidgetActivitySchema = z.object({
  id: z.string(),
  type: z.literal('widget'),
  widgetId: z.string(),
  config: z.record(z.unknown()),
  description: z.string().optional(),
}).strict();

export type WidgetActivity = z.infer<typeof WidgetActivitySchema>;
```

Update the `ActivitySchema` discriminated union to include it:

```typescript
export const ActivitySchema = z.discriminatedUnion('type', [
  ReadingActivitySchema,
  ExerciseActivitySchema,
  DiscussionActivitySchema,
  ReflectionActivitySchema,
  VideoActivitySchema,
  WidgetActivitySchema, // NEW
]);
```

Export the type from the barrel if applicable (check `packages/course-compiler/src/schemas/index.ts`).

### Tests

Create `packages/course-compiler/src/schemas/__tests__/widget-activity.test.ts`:

1. **Valid widget activity**: `parse({ id: 'w1', type: 'widget', widgetId: 'open-edu.matching', config: { pairs: [] } })` succeeds.
2. **Missing widgetId**: `parse({ id: 'w1', type: 'widget', config: {} })` fails.
3. **Empty config is allowed**: `parse({ id: 'w1', type: 'widget', widgetId: 'test', config: {} })` succeeds.
4. **Description is optional**: `parse({ id: 'w1', type: 'widget', widgetId: 'test', config: {}, description: 'Match the items' })` succeeds and preserves description.
5. **Discriminated union works**: `ActivitySchema.parse({ type: 'reading', content: 'hello' })` still works.

### Acceptance

- `pnpm --filter @open-edu/course-compiler build` passes
- `pnpm --filter @open-edu/course-compiler test` passes
- WidgetActivitySchema validates correctly with the discriminated union

---

## Story VIS-08: Create JSON input parser for course-compiler

**Package:** `@open-edu/course-compiler`
**Files:**
- `packages/course-compiler/src/parser/json-input.ts` — **NEW**
- `packages/course-compiler/src/parser/index.ts` — **EDIT** (export new parser)

**Depends on:** VIS-07
**Estimated effort:** Medium (2-3 hours)

### Objective

Create a parser that reads `course-spec.json` (produced by VIS-05) and returns a validated `CourseModel` compatible with the course-compiler's package generator.

### Context

Currently the course-compiler only accepts markdown input. With the JSON format, widget configs flow through without encoding/decoding. The JSON parser needs to:

1. Accept a JSON string
2. Validate it against a JSON schema (mirroring `CourseSpecJSON` from the pipeline)
3. Map the flat `lessons[]` array to the nested `modules[] → lessons[]` structure
4. Create one module per unique `chapterCode` (or group all lessons into one module)
5. Convert `widget`-type activities into `WidgetActivitySchema`-compliant objects

The JSON schema for `course-spec.json` should be a Zod schema defined in the course-compiler (not shared from the pipeline, to maintain package isolation).

### Implementation

#### 1. Create `packages/course-compiler/src/parser/json-input.ts`

```typescript
import { z } from 'zod';
import type { CourseModel, CourseMetadata, CourseModule, Lesson, Activity, CompilerDiagnostic } from '../schemas/index.js';

// ---- JSON Input Schema ----

const MCQQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
});

const ActivityJSONSchema = z.object({
  step: z.enum(['observe', 'guided_practice', 'independent_practice', 'mastery_check', 'positive_completion']),
  order: z.number(),
  type: z.enum(['reading', 'exercise', 'quiz', 'reflection', 'widget']),
  description: z.string(),
  instructions: z.string().optional(),
  examples: z.array(z.string()).optional(),
  questions: z.array(MCQQuestionSchema).optional(),
  widgetId: z.string().optional(),
  widgetConfig: z.record(z.unknown()).optional(),
});

const LessonJSONSchema = z.object({
  id: z.string(),
  title: z.string(),
  objectives: z.array(z.string()),
  coreIdea: z.string(),
  examples: z.array(z.string()),
  misconceptions: z.array(z.string()),
  estimatedMinutes: z.number().optional(),
  activities: z.array(ActivityJSONSchema),
});

const CourseSpecJSONSchema = z.object({
  format: z.literal('openedu-course-spec'),
  version: z.literal(1),
  generatedAt: z.string(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string().optional(),
    version: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    estimatedHours: z.number().optional(),
    generated: z.boolean(),
  }),
  lessons: z.array(LessonJSONSchema),
});

type CourseSpecJSON = z.infer<typeof CourseSpecJSONSchema>;

// ---- Mapping functions ----

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unnamed';
}

function mapLesson(jsonLesson: z.infer<typeof LessonJSONSchema>): Lesson {
  const activities: Activity[] = jsonLesson.activities
    .filter((a) => a.type !== 'quiz') // quizzes are extracted separately below
    .map((a) => {
      if (a.type === 'widget') {
        return {
          id: slugify(`${a.step}-${a.description}`),
          type: 'widget' as const,
          widgetId: a.widgetId || '',
          config: a.widgetConfig || {},
          description: a.description,
        };
      }
      if (a.type === 'reflection') {
        return {
          id: slugify(`reflection-${a.description}`),
          type: 'reflection' as const,
          prompt: a.instructions || a.description,
          private: true,
        };
      }
      // reading or exercise
      return {
        id: slugify(`${a.step}-${a.description}`),
        type: a.type === 'reading' ? 'reading' as const : 'exercise' as const,
        content: a.instructions || '',
        instructions: a.instructions || '',
      };
    });

  // Extract quiz if present
  const quizActivity = jsonLesson.activities.find((a) => a.type === 'quiz');
  const quiz = quizActivity && quizActivity.questions ? {
    id: slugify(`quiz-${jsonLesson.id}`),
    title: quizActivity.description,
    questions: quizActivity.questions.map((q, qi) => ({
      id: `q-${qi + 1}`,
      type: 'multiple-choice' as const,
      prompt: q.question,
      options: q.options.map((opt, oi) => ({
        id: `opt-${oi + 1}`,
        text: opt,
        correct: oi === q.correctIndex,
      })),
    })),
    shuffleQuestions: false,
  } : undefined;

  return {
    id: jsonLesson.id,
    title: jsonLesson.title,
    objectives: jsonLesson.objectives.map((obj, i) => ({
      id: `obj-${i + 1}`,
      description: obj,
    })),
    content: jsonLesson.coreIdea + '\n\n' + jsonLesson.examples.map((e) => `- ${e}`).join('\n'),
    activities: activities.length > 0 ? activities : undefined,
    quiz: quiz,
    estimatedMinutes: jsonLesson.estimatedMinutes,
  };
}

export function parseCourseSpecJSON(jsonStr: string): {
  model: CourseModel | null;
  diagnostics: CompilerDiagnostic[];
} {
  const diagnostics: CompilerDiagnostic[] = [];
  
  // Parse and validate JSON structure
  let parsed: CourseSpecJSON;
  try {
    const raw = JSON.parse(jsonStr);
    const result = CourseSpecJSONSchema.safeParse(raw);
    if (!result.success) {
      diagnostics.push({
        severity: 'error',
        message: `Invalid course spec JSON: ${result.error.message}`,
        code: 'INVALID_JSON_SCHEMA',
      });
      return { model: null, diagnostics };
    }
    parsed = result.data;
  } catch (err) {
    diagnostics.push({
      severity: 'error',
      message: `Failed to parse JSON: ${err instanceof Error ? err.message : String(err)}`,
      code: 'JSON_PARSE_ERROR',
    });
    return { model: null, diagnostics };
  }
  
  // Convert lessons
  const lessons = parsed.lessons.map(mapLesson);
  
  // Group into modules (single module for auto-generated content)
  const metadata: CourseMetadata = {
    title: parsed.metadata.title,
    description: parsed.metadata.description,
    author: parsed.metadata.author,
    version: parsed.metadata.version,
    difficulty: parsed.metadata.difficulty,
    estimatedHours: parsed.metadata.estimatedHours,
  };
  
  const module: CourseModule = {
    id: 'module-1',
    title: parsed.metadata.title,
    description: parsed.metadata.description,
    lessons,
  };
  
  const model: CourseModel = {
    metadata,
    modules: [module],
  };
  
  return { model, diagnostics };
}
```

#### 2. Update `packages/course-compiler/src/parser/index.ts`

```typescript
import { parseMarkdown } from './markdown-ast.js';
import { parseSemantic } from './semantic-parser.js';
import { parseCourseSpecJSON } from './json-input.js'; // NEW
import type { CourseModel, CompilerDiagnostic } from '../schemas/index.js';

export function parseCourseSpec(markdown: string): { ... } {
  // existing
}

export { parseCourseSpecJSON }; // NEW
export * from './markdown-ast.js';
export * from './semantic-parser.js';
```

### Tests

Create `packages/course-compiler/src/parser/__tests__/json-input.test.ts`:

1. **Valid JSON parses correctly**: Feed a minimal valid JSON → returns `model` with 1 module, 1 lesson, correct metadata.
2. **Widget activity maps correctly**: JSON with a widget activity → returned `Activity` has `type: 'widget'` and `widgetId` preserved.
3. **Quiz activity maps correctly**: JSON with quiz → returned lesson has `quiz` with questions.
4. **Reading activity maps correctly**: JSON with reading → returned `Activity` has `type: 'reading'` and `content` preserved.
5. **Reflection activity maps correctly**: JSON with reflection → returned `Activity` has `type: 'reflection'` and `prompt`.
6. **Invalid JSON string**: `parseCourseSpecJSON('not json')` → `model` is null, diagnostic error emitted.
7. **Missing required field**: JSON without `format` field → `model` is null, diagnostic error emitted.
8. **Can parse a real course-spec.json**: Construct a full realistic JSON (multiple lessons, mixed activity types) and verify all fields map correctly.

### Fixture file

Create `packages/course-compiler/src/parser/__tests__/fixtures/sample-course-spec.json` with a realistic example:

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-07-01T00:00:00.000Z",
  "metadata": { "title": "Test Course", "description": "A test", "generated": true },
  "lessons": [
    {
      "id": "lesson-101",
      "title": "Identify the definition of a family",
      "objectives": ["Identify family types"],
      "coreIdea": "A family is the smallest unit of society.",
      "examples": ["Joint families", "Nuclear families"],
      "misconceptions": [],
      "activities": [
        { "step": "observe", "order": 1, "type": "widget", "description": "Family Matching",
          "widgetId": "open-edu.matching", "widgetConfig": { "pairs": [{"itemA": "Joint", "itemB": "Multiple generations"}] } },
        { "step": "guided_practice", "order": 2, "type": "reading", "description": "Examples", "instructions": "Read about families" },
        { "step": "mastery_check", "order": 3, "type": "quiz", "description": "Quiz",
          "questions": [{"question": "What is a family?", "options": ["A", "B", "C", "D"], "correctIndex": 0}] },
        { "step": "positive_completion", "order": 4, "type": "reflection", "description": "Well done", "instructions": "Reflect" }
      ]
    }
  ]
}
```

### Acceptance

- `pnpm --filter @open-edu/course-compiler build` passes
- `pnpm --filter @open-edu/course-compiler test` passes
- Valid JSON maps completely and correctly to `CourseModel`
- Invalid JSON returns null model with useful error diagnostics

---

## Story VIS-09: Auto-detect `.json` input in course-compiler CLI

**Package:** `@open-edu/course-compiler`
**Files:** `packages/course-compiler/src/cli/index.ts`
**Depends on:** VIS-08
**Estimated effort:** Small (15 min)

### Objective

Make the course-compiler CLI detect `.json` vs `.md` input by file extension and dispatch to the appropriate parser.

### Context

Currently the CLI always calls `parseCourseSpec(content)` which expects markdown. With the JSON format, we need to call `parseCourseSpecJSON(content)` when the input file has a `.json` extension.

### Implementation

In `packages/course-compiler/src/cli/index.ts`, update the `compile()` function:

```typescript
import { parseCourseSpec, parseCourseSpecJSON } from '../parser/index.js';

export async function compile(specPath: string, options: CompileOptions): Promise<CompileResult> {
  const resolvedPath = resolve(specPath);
  const diagnostics: CompilerDiagnostic[] = [];

  let content: string;
  try {
    content = await readFile(resolvedPath, 'utf-8');
  } catch (error) { /* ... existing ... */ }

  // Detect format by extension
  const isJson = resolvedPath.toLowerCase().endsWith('.json');
  
  let parsed: { model: CourseModel | null; diagnostics: CompilerDiagnostic[] };
  if (isJson) {
    parsed = parseCourseSpecJSON(content);
  } else {
    parsed = parseCourseSpec(content);
  }
  
  diagnostics.push(...parsed.diagnostics);
  // ... rest of existing logic unchanged ...
}
```

Also update the command description:

```typescript
new Command('compile')
  .description('Compile a course-spec.md or course-spec.json into an OpenEdu educational package')
  .argument('<file>', 'Path to course-spec.md or course-spec.json')
```

### Tests

Create `packages/course-compiler/src/cli/__tests__/compile.test.ts`:

1. **.md file triggers markdown parser**: Mock `parseCourseSpec` and `parseCourseSpecJSON`, call `compile('spec.md', ...)`, verify `parseCourseSpec` was called.
2. **.json file triggers JSON parser**: Same setup, `compile('spec.json', ...)`, verify `parseCourseSpecJSON` was called.
3. **No extension**: `.md` path is default (backward compatible).
4. **Mixed case**: `.JSON` file extension still detected correctly.

### Acceptance

- `pnpm --filter @open-edu/course-compiler build` passes
- `pnpm --filter @open-edu/course-compiler test` passes
- `edu compile course-spec.json` calls the JSON parser
- `edu compile course-spec.md` calls the markdown parser (unchanged)

---

## Story VIS-10: Generate widget JSON nodes in package-generator

**Package:** `@open-edu/course-compiler`
**Files:** `packages/course-compiler/src/generators/package-generator.ts`
**Depends on:** VIS-08
**Estimated effort:** Small (30 min)

### Objective

When the package generator encounters a `type: 'widget'` activity, write it as a JSON node file matching the runtime's expected format (`{ type: "exercise", widget: "...", config: {...} }`).

### Context

The package generator currently handles:
- `reading` / `exercise` / `discussion` → `.md` files
- `reflection` → `.json` files (ReflectionNode format)
- `video` → `.md` files
- Quiz → `.json` files (`{ type: "exercise", widget: "open-edu.multiple-choice", config: {...} }`)

Widget activities should produce JSON files in the same format as quizzes: `{ type: "exercise", widget: widgetId, config: config }`. This is what the runtime's `WidgetRenderer` expects via the widget registry.

### Implementation

In `packages/course-compiler/src/generators/package-generator.ts`, in `generateSingleModule()` within the lesson activities loop:

After the existing `if (activity.type === 'reflection')` block (around line 82-86), add:

```typescript
if (activity.type === 'widget') {
  // Generate widget JSON node (same pattern as quiz JSON nodes)
  const widgetContent = {
    type: 'exercise',
    widget: activity.widgetId,
    title: displayTitle(slug, activity.widgetId),
    config: activity.config,
  };
  await writeJson(join(outputDir, `nodes/${slug}.json`), widgetContent);
  nodeFiles.push({
    id: slug,
    title: displayTitle(activity.id, activity.widgetId || activity.type),
    path: `nodes/${slug}.json`,
  });
  continue; // skip the default .md fallback
}
```

Also update the `generateActivityMarkdown()` function to handle `widget` type gracefully — it's not strictly needed since widget activities write JSON, but for safety:

The existing `generateActivityMarkdown` checks `'content' in activity`, `'instructions' in activity`, and `'prompt' in activity`. Widget activities have `config` and `widgetId` instead. If `generateActivityMarkdown` is ever called on a widget activity (it shouldn't be), it should produce a sensible fallback:

```typescript
function generateActivityMarkdown(activity: Activity): string {
  // existing code ...
  if ('content' in activity && activity.content) {
    parts.push(activity.content);
  } else if ('instructions' in activity && activity.instructions) {
    parts.push(activity.instructions);
  } else if ('prompt' in activity && activity.prompt) {
    parts.push(activity.prompt);
  } else if ('widgetId' in activity && activity.widgetId) {
    parts.push(`[Interactive activity: ${activity.widgetId}]`);
  }
  // ...
}
```

### Tests

Update `packages/course-compiler/src/generators/__tests__/package-generator.test.ts`:

1. **Widget activity generates JSON node**: Create a `CourseModel` with a widget activity, call `generatePackage()`, verify a `.json` file was created in the nodes directory.
2. **Widget JSON format matches runtime expectation**: Read the generated JSON file, verify it has `{ type: "exercise", widget: "...", config: {...} }`.
3. **Widget alongside other activity types**: A lesson with reading + widget + quiz activities generates all three correctly.
4. **Existing tests still pass**: All existing package generator tests pass unchanged.

### Acceptance

- `pnpm --filter @open-edu/course-compiler build` passes
- `pnpm --filter @open-edu/course-compiler test` passes
- Widget activities produce `.json` files with correct `{ type: "exercise", widget, config }` format
- Non-widget activities unaffected

---

## Story VIS-11: Build exemplars + test the full pipeline

**Package:** `@open-edu/pipeline`
**Files:**
- `packages/pipeline/src/generate-activities/exemplars.ts`
- `packages/pipeline/src/output/__tests__/json-output.test.ts` (already created in VIS-05)

**Depends on:** VIS-04, VIS-06, VIS-10
**Estimated effort:** Medium (2 hours)

### Objective

Add widget-focused exemplars to the few-shot prompt examples. Create integration-level tests verifying the full pipeline produces valid markdown + JSON output with mixed activity types.

### Context

The exemplars in `exemplars.ts` provide the LLM with examples of good output. Currently they only show `reading`, `exercise`, `quiz`, and `reflection` types. We need to add `widget` exemplars showing the LLM how to format widget activities correctly.

### Implementation

#### 1. Update `packages/pipeline/src/generate-activities/exemplars.ts`

Add 3-4 widget exemplars:

```typescript
{
  type: 'widget',
  step: 'observe',
  conceptDescription: 'family_types — Identify different family structures',
  content: {
    description: 'Family Types Matching',
    instructions: 'Match each family type to its description.',
    widgetConfig: {
      pairs: [
        { itemA: 'Joint Family', itemB: 'Multiple generations living together' },
        { itemA: 'Nuclear Family', itemB: 'Parents and children only' },
        { itemA: 'Single-Parent Family', itemB: 'One parent raising children' },
      ],
    },
  },
  widgetId: 'open-edu.matching',
},
{
  type: 'widget',
  step: 'guided_practice',
  conceptDescription: 'girls_education — Issues affecting girls\' status',
  content: {
    description: 'Issues Affecting Girls',
    instructions: 'Drag each issue to the correct category.',
    widgetConfig: {
      items: [
        { id: 'i1', label: 'Female infanticide', emoji: '⚠️' },
        { id: 'i2', label: 'Less education for girls', emoji: '📚' },
        { id: 'i3', label: 'Early marriage', emoji: '💍' },
      ],
      targets: [
        { id: 't1', label: 'Social Issue' },
        { id: 't2', label: 'Educational Issue' },
      ],
      expectedPositions: { i1: 't1', i2: 't2', i3: 't1' },
    },
  },
  widgetId: 'open-edu.drag-drop',
},
{
  type: 'widget',
  step: 'independent_practice',
  conceptDescription: 'respect_elders — Explain the importance of respecting elders',
  content: {
    description: 'Ways to Respect Elders',
    instructions: 'Put the steps in the correct order for showing respect to elders.',
    widgetConfig: {
      items: [
        { id: 's1', label: 'Listen carefully' },
        { id: 's2', label: 'Acknowledge their advice' },
        { id: 's3', label: 'Apply what you learned' },
        { id: 's4', label: 'Thank them' },
      ],
      correctOrder: ['s1', 's2', 's3', 's4'],
    },
  },
  widgetId: 'open-edu.sequencing',
},
```

Update the `Exemplar` interface in `exemplars.ts` to include optional `widgetId` and `widgetConfig`:

```typescript
export interface Exemplar {
  type: string;
  step: string;
  conceptDescription: string;
  content: {
    description: string;
    instructions?: string;
    examples?: string[];
    questions?: { question: string; options: string[]; correctIndex: number }[];
    widgetConfig?: Record<string, unknown>;
  };
  widgetId?: string;
}
```

#### 2. Create `packages/pipeline/src/output/__tests__/pipeline-integration.test.ts`

An integration test that mocks the LLM and verifies the end-to-end flow:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderCourseSpec } from '../index.js';
import { renderCourseSpecJSON } from '../index.js';
import type { ConceptActivityPair, GeneratedConcept, GeneratedActivity } from '../../types.js';

function makeMockPair(overrides?: Partial<GeneratedActivity>): ConceptActivityPair {
  const concept: GeneratedConcept = {
    conceptId: 'family_types',
    chapterCode: 'CH1',
    chapterName: 'Understanding Families',
    learningObjective: 'Identify family types',
    coreIdea: 'A family is the smallest unit of society.',
    examples: ['Joint families have multiple generations'],
    misconceptions: ['All families are nuclear'],
    supports: { visual: true },
    masteryCriteria: 0.8,
    difficulty: 'beginner',
    estimatedDuration: 15,
    dependencies: [],
  };
  
  const activity: GeneratedActivity = {
    step: 'observe',
    courseSpecType: 'widget',
    order: 1,
    content: {
      description: 'Family Matching',
      instructions: 'Match family types',
      widgetConfig: { pairs: [{ itemA: 'Joint', itemB: 'Multiple generations' }] },
    },
    widgetId: 'open-edu.matching',
    widgetConfig: { pairs: [{ itemA: 'Joint', itemB: 'Multiple generations' }] },
    ...overrides,
  };
  
  return { concept, activities: [activity] };
}

describe('pipeline output integration', () => {
  it('generates markdown with widget badge for widget activities', () => {
    const pair = makeMockPair();
    const md = renderCourseSpec([pair]);
    expect(md).toContain('Activity:');
    expect(md).toContain('Family Matching');
    // Widget activities should NOT dump raw JSON in markdown
    expect(md).not.toContain('"widgetId"');
  });
  
  it('generates JSON with preserved widget config', () => {
    const pair = makeMockPair();
    const json = renderCourseSpecJSON([pair]);
    expect(json.lessons[0]?.activities[0]?.widgetId).toBe('open-edu.matching');
    expect(json.lessons[0]?.activities[0]?.widgetConfig).toBeDefined();
    expect(json.lessons[0]?.activities[0]?.type).toBe('widget');
  });
  
  it('handles mixed activity types in JSON output', () => {
    const pair = makeMockPair();
    pair.activities.push({
      step: 'mastery_check',
      courseSpecType: 'quiz',
      order: 2,
      content: {
        description: 'Quiz',
        questions: [{ question: 'Test?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }],
      },
    });
    const json = renderCourseSpecJSON([pair]);
    expect(json.lessons[0]?.activities).toHaveLength(2);
    expect(json.lessons[0]?.activities[1]?.type).toBe('quiz');
  });
  
  it('round-trips through course-compiler JSON parser', async () => {
    // Generate JSON from pipeline
    const pair = makeMockPair();
    const json = renderCourseSpecJSON([pair]);
    const jsonStr = JSON.stringify(json);
    
    // Parse with course-compiler JSON parser
    const { parseCourseSpecJSON } = await import('@open-edu/course-compiler/parser/json-input');
    const result = parseCourseSpecJSON(jsonStr);
    expect(result.model).not.toBeNull();
    expect(result.model!.modules[0]?.lessons[0]?.activities).toHaveLength(1);
    // Widget activity should be preserved
    const activity = result.model!.modules[0]!.lessons[0]!.activities![0]!;
    expect(activity.type).toBe('widget');
  });
});
```

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- `pnpm --filter @open-edu/pipeline test` passes
- Widget exemplars are structurally valid when fed back through the LLM response parser
- Integration test verifies markdown + JSON + round-trip through course-compiler

---

## Story VIS-12: Markdown output renders widget badge (instead of raw JSON)

**Package:** `@open-edu/pipeline`
**Files:** `packages/pipeline/src/output/index.ts`
**Depends on:** VIS-05
**Estimated effort:** Small (15 min)

### Objective

Update the markdown output renderer to show a clean widget badge for widget-type activities instead of dumping raw JSON or showing nothing.

### Context

Currently `renderActivity()` in `output/index.ts` handles `reading`, `exercise`, `quiz`, and `reflection` types. Widget activities would fall through to no handler. We need to render a clean human-readable badge.

### Implementation

In `packages/pipeline/src/output/index.ts`, add a new handler in `renderActivity()`:

```typescript
function renderActivity(activity: GeneratedActivity, conceptId?: string): string[] {
  const lines: string[] = [];
  // ... existing handlers for mastery_check, reflection, reading, exercise ...

  // NEW: Widget badge
  if (activity.courseSpecType === 'widget') {
    const label = activity.content.description || 'Interactive Activity';
    const widgetName = activity.widgetId?.replace('open-edu.', '') || 'widget';
    
    lines.push(`### Activity: ${label} [Widget]`);
    lines.push('');
    if (activity.content.instructions) {
      lines.push(activity.content.instructions);
      lines.push('');
    }
    // Add a readable badge showing which widget is used
    lines.push(`> 🧩 **Interactive ${widgetName} activity** — full configuration available in course-spec.json`);
    lines.push('');
  }
  
  return lines;
}
```

### Tests

Add to existing output tests:

1. **Widget badge rendered**: `renderCourseSpec` with widget activity produces markdown containing `[Widget]` and the widget name.
2. **Raw JSON not in markdown**: The markdown does not contain `"widgetId"` or `"widgetConfig"`.
3. **Fallback description used**: Widget without `instructions` still produces a heading and badge.

### Acceptance

- `pnpm --filter @open-edu/pipeline build` passes
- `pnpm --filter @open-edu/pipeline test` passes
- `course-spec.md` is human-readable without raw JSON
- Widget name displayed as a user-friendly badge

---

## Appendix A: Example widget configs for common EVS/social studies concepts

| Concept | Suggested Widget | Config Sketch |
|---------|-----------------|---------------|
| Family types | `matching` | `pairs: [{itemA: "Joint", itemB: "Multiple generations"}, {itemA: "Nuclear", itemB: "Parents+children"}]` |
| Parent responsibilities | `drag-drop` | `items: [{id:"r1", label:"Provide education"}], targets: [{id:"t1", label:"Parent"}, {id:"t2", label:"Teacher"}], expectedPositions: {r1: "t1"}` |
| Issues affecting girls | `story-question` | `scenario: "In a village...", questions: [{question: "What issue does this show?", options: [...], correctIndex: 0}]` |
| Respecting elders | `sequencing` | `items: [{id:"l", label:"Listen"}, {id:"a", label:"Acknowledge"}, {id:"t", label:"Thank"}], correctOrder: ["l","a","t"]` |
| Support for disabled | `drag-drop` | `items: [labels of supports], targets: [categories], expectedPositions: {...}` |
| Measures for women | `matching` | `pairs: [{itemA: "Reservation", itemB: "Political representation"}, {itemA: "Equal property law", itemB: "Economic rights"}]` |

## Appendix B: File creation checklist

For each new file, create with standard project conventions:

- `// ... existing imports` for files based on existing patterns
- Standard project license header if required
- Follow existing code style (semicolons, indentation, imports)
- Verify with `pnpm typecheck` before marking complete
