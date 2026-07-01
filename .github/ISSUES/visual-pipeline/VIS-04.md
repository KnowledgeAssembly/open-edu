---
name: '📖 VIS-04: Delete type-selector.ts'
title: '[Story] VIS-04: Delete type-selector.ts (LLM now chooses type)'
labels: ['type:story']
---

# Story VIS-04: Delete `type-selector.ts`

## Objective

Remove the hardcoded type-mapping logic in `type-selector.ts` since the LLM now selects types dynamically. Replace with a simple default type map for backward compatibility.

## Context

`type-selector.ts` maps each step to a single hardcoded type:
- observe → reading
- guided_practice → exercise
- independent_practice → exercise
- mastery_check → quiz
- positive_completion → reflection

After VIS-02 and VIS-03, the LLM prompt for each step includes the widget catalog and the LLM chooses `reading`, `exercise`, or `widget` per-concept, per-step. The hardcoded mapping is dead code. However, we still need default types for the initial call to `generateStep()`.

## Scope

- **Delete**: `packages/pipeline/src/generate-activities/type-selector.ts`
- **Edit**: `packages/pipeline/src/generate-activities/index.ts` (remove imports, add default type map)
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `type-selector.ts` is deleted
- [ ] No remaining imports from `type-selector.js` in index.ts
- [ ] `generateActivitiesForConcept` compiles with an inline default type map
- [ ] All existing tests pass

## Technical Notes

### In `packages/pipeline/src/generate-activities/index.ts`:

1. Remove import: `import { selectTypesForConcept } from './type-selector.js';`

2. Add a default type map at module level:

```typescript
const DEFAULT_TYPES: Record<string, string> = {
  observe: 'reading',
  guided_practice: 'exercise',
  independent_practice: 'exercise',
  mastery_check: 'quiz',
  positive_completion: 'reflection',
};
```

3. Update `generateActivitiesForConcept`:

```typescript
export async function generateActivitiesForConcept(
  llm: LlmProvider,
  concept: GeneratedConcept,
  validationErrors?: string[],
): Promise<{ activities: GeneratedActivity[]; warnings: string[]; errors: string[] }> {
  const activities: GeneratedActivity[] = [];
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  for (let i = 0; i < STEP_ORDER.length; i++) {
    const step = STEP_ORDER[i]!;
    const type = DEFAULT_TYPES[step]!; // initial suggestion, LLM can override

    const result = await generateStep(llm, step, type, concept, i + 1, MAX_RETRIES, validationErrors);

    if (result.activity) {
      activities.push(result.activity);
    } else {
      allErrors.push(...result.errors);
    }
  }

  return { activities: activities, warnings: allWarnings, errors: allErrors };
}
```

4. In `generateStep()`, the prompt tells the LLM: "The default type for this step is `{type}`. You may choose a different type if it better suits the concept." After the LLM responds, use the LLM-chosen type instead of the passed `type`:

```typescript
const responseType = result.type as string;
const activity: GeneratedActivity = {
  step: step as GeneratedActivity['step'],
  courseSpecType: responseType as GeneratedActivity['courseSpecType'],
  // ...
};
```

Note: Ensure `generateStep` already supports receiving a different type back in the parsed response. Check that `stepOutputSchema` returns the actual type from the JSON, not the passed type parameter.

## Deliverables

- [x] Implementation (delete file + update index.ts)
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
```

Also verify `type-selector.ts` no longer exists (not even as an empty file).

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-02](./VIS-02.md), [VIS-03](./VIS-03.md)
