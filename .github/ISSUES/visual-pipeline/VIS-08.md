---
name: '📖 VIS-08: Create JSON input parser for course-compiler'
title: '[Story] VIS-08: Create JSON input parser for course-compiler'
labels: ['type:story']
---

# Story VIS-08: Create JSON input parser for course-compiler

## Objective

Create a `parseCourseSpecJSON()` function that reads `course-spec.json` (produced by VIS-05) and returns a validated `CourseModel` compatible with the course-compiler's package generator.

## Context

Currently the course-compiler only accepts markdown input. With the JSON format, widget configs flow through without encoding/decoding. The JSON parser needs to:

1. Accept a JSON string
2. Validate it against a Zod schema (mirroring `CourseSpecJSON` from the pipeline)
3. Map the flat `lessons[]` array to the nested `modules[] → lessons[]` structure
4. Convert `widget`-type activities into `WidgetActivitySchema`-compliant objects

## Scope

- **Create**: `packages/course-compiler/src/parser/json-input.ts`
- **Edit**: `packages/course-compiler/src/parser/index.ts` (export new parser)
- **Create**: `packages/course-compiler/src/parser/__tests__/fixtures/sample-course-spec.json` (fixture file)
- **Create**: `packages/course-compiler/src/parser/__tests__/json-input.test.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `parseCourseSpecJSON()` validates input against a Zod schema
- [ ] Valid JSON returns a `CourseModel` with correct structure
- [ ] Widget activities are preserved with type `'widget'` and `widgetId` intact
- [ ] Quiz activities are mapped correctly (questions, options, correctIndex)
- [ ] Reading/exercise/reflection activities are mapped correctly
- [ ] Invalid JSON (malformed, missing fields) returns `null` model with error diagnostics
- [ ] All lessons are grouped into a single module
- [ ] Metadata flows through correctly

## Technical Notes

### 1. Create `packages/course-compiler/src/parser/json-input.ts`

Define the input Zod schema for `course-spec.json`:

```typescript
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
  lessons: z.array(z.object({
    id: z.string(),
    title: z.string(),
    objectives: z.array(z.string()),
    coreIdea: z.string(),
    examples: z.array(z.string()),
    misconceptions: z.array(z.string()),
    estimatedMinutes: z.number().optional(),
    activities: z.array(z.object({
      step: z.enum(['observe', 'guided_practice', 'independent_practice', 'mastery_check', 'positive_completion']),
      order: z.number(),
      type: z.enum(['reading', 'exercise', 'quiz', 'reflection', 'widget']),
      description: z.string(),
      instructions: z.string().optional(),
      examples: z.array(z.string()).optional(),
      questions: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().min(0).max(3),
      })).optional(),
      widgetId: z.string().optional(),
      widgetConfig: z.record(z.unknown()).optional(),
    })),
  })),
});
```

### 2. Mapping logic

Write a `mapLesson()` function that converts each JSON lesson to a `Lesson` object:

- **widget activities** → `{ id, type: 'widget', widgetId, config, description }` (uses `WidgetActivitySchema`)
- **reading/exercise** → `{ id, type, content, instructions }`
- **reflection** → `{ id, type: 'reflection', prompt, private: true }`
- **quiz** (the first quiz activity in the list becomes the lesson's quiz) → `{ id, title, questions: [{ id, type: 'multiple-choice', prompt, options }], shuffleQuestions: false }`

### 3. Module structure

Group all lessons into a single module with `id: 'module-1'` and the course title as module title. This matches how single-module courses work in the existing markdown parser.

### 4. Tests

Create `packages/course-compiler/src/parser/__tests__/json-input.test.ts`:

1. **Valid JSON parses correctly** — minimum valid input returns model with 1 module, 1 lesson.
2. **Widget activity maps correctly** — widget type, widgetId, and config preserved.
3. **Quiz activity maps correctly** — questions array populated.
4. **Reading activity maps correctly** — content preserved.
5. **Reflection activity maps correctly** — prompt preserved.
6. **Invalid JSON string** — `parseCourseSpecJSON('not json')` → null model, diagnostic error.
7. **Missing required field** — JSON without `format` → null model.
8. **Full fixture** — load a realistic JSON file, verify all fields map correctly.

### Fixture file

Create `packages/course-compiler/src/parser/__tests__/fixtures/sample-course-spec.json` with a realistic multi-activity, multi-lesson spec including a widget activity.

## Deliverables

- [x] Implementation (JSON parser + Zod schema)
- [x] Automated tests (unit tests + fixture)
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/course-compiler build
pnpm --filter @open-edu/course-compiler test
pnpm --filter @open-edu/course-compiler typecheck
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-07](./VIS-07.md)
- Input format defined in: [VIS-05](./VIS-05.md)
