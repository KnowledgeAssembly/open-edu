---
name: '📖 VIS-05: Add JSON output renderer to pipeline'
title: '[Story] VIS-05: Add JSON output renderer to pipeline'
labels: ['type:story']
---

# Story VIS-05: Add JSON output renderer to pipeline

## Objective

Add a `renderCourseSpecJSON()` function that serializes `ConceptActivityPair[]` to a structured JSON schema, preserving widget configs as first-class nested objects instead of encoding them in markdown.

## Context

The current `renderCourseSpec()` produces a markdown string. Widget configs are complex nested objects that don't render well in markdown. We need a JSON format that:
- Carries all the same content as the markdown (metadata, lesson text, quiz questions)
- Carries widget configs as native JSON objects
- Can be read by the course-compiler's JSON input parser (VIS-08)
- Is self-contained (no external references)

## Scope

- **Edit**: `packages/pipeline/src/output/index.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `renderCourseSpecJSON()` converts `ConceptActivityPair[]` to a `CourseSpecJSON` object
- [ ] Output includes `format: 'openedu-course-spec'` and `version: 1`
- [ ] Widget configs are preserved verbatim (not flattened or stringified)
- [ ] Quiz questions are preserved verbatim
- [ ] Metadata matches the markdown output
- [ ] `writeCourseSpecJSONOutput()` writes a `.json` file to disk
- [ ] JSON is valid and parseable

## Technical Notes

### Types to add to `packages/pipeline/src/output/index.ts`:

```typescript
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
  widgetId?: string;
  widgetConfig?: Record<string, unknown>;
}
```

### `renderCourseSpecJSON()` function:

Iterate through `ConceptActivityPair[]` and create a flat `lessons[]` array. Each concept becomes one lesson (numbered 101, 102, ...). For each activity in the concept, map the `GeneratedActivity` fields directly to `CourseSpecActivityJSON`.

Use the metadata logic from the existing `generateFrontmatter()` to compute title, difficulty, and estimated hours.

### `writeCourseSpecJSONOutput()`:

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
  const filePath = writeCourseSpec(outputDir, filename, jsonStr, force); // reuse existing write function
  return { filePath, concepts: pairs.length };
}
```

The existing `writeCourseSpec()` writes a string to a file. It works for JSON too since it just handles file I/O.

### Tests:

Create `packages/pipeline/src/output/__tests__/json-output.test.ts`:

1. Verifies metadata structure
2. Preserves widget configs
3. Preserves quiz questions
4. Preserves text activities
5. `generatedAt` is ISO 8601 timestamp
6. Handles empty activities array
7. Handles multiple concepts

## Deliverables

- [x] Implementation (renderer + writer functions)
- [x] Automated tests
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline typecheck
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-01](./VIS-01.md)
- Supports: [VIS-08](./VIS-08.md) (course-compiler JSON parser reads this format)
