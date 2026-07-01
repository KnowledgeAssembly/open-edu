---
name: '📖 VIS-03: Add widget content schema + validation to activity generator'
title: '[Story] VIS-03: Add widget content schema + validation to activity generator'
labels: ['type:story']
---

# Story VIS-03: Add widget content schema + validation to activity generator

## Objective

Update the activity generator (`generate-step.ts`) to accept `type: "widget"` output from the LLM, validate the widget config against the corresponding widget's Zod schema, and fall back to `reading` if validation fails.

## Context

The current `stepOutputSchema()` only handles `reading`, `exercise`, `quiz`, and `reflection`. The activity generator calls the LLM with a prompt, parses the JSON response against the schema, and creates a `GeneratedActivity`. We need to add `widget` handling with config validation.

Each widget in `@open-edu/widgets` exports a Zod config schema. We need to look up the schema by `widgetId`, parse the `widgetConfig` against it, and reject if invalid (with graceful fallback to `reading` type).

## Scope

- **Allowed**: `packages/pipeline/src/generate-activities/index.ts`
- **Create**: `packages/pipeline/src/generate-activities/widget-schemas.ts`
- **Exclusions**: No prompt files, no types

## Acceptance Criteria

- [ ] LLM returning `type: "widget"` with valid config → `GeneratedActivity` has `courseSpecType: 'widget'` and `widgetId` is set
- [ ] LLM returning `type: "widget"` with invalid config → system falls back to `reading` type
- [ ] Retry mechanism still works for widget types (LLM gets retries on invalid output)
- [ ] Widget schema registry can look up schemas by widget ID
- [ ] Existing tests for reading/exercise/quiz/reflection still pass

## Technical Notes

### Create `packages/pipeline/src/generate-activities/widget-schemas.ts`:

```typescript
import { z } from 'zod';

const widgetSchemaRegistry = new Map<string, z.ZodType>();

export function registerWidgetSchema(widgetId: string, schema: z.ZodType): void {
  widgetSchemaRegistry.set(widgetId, schema);
}

export function getWidgetSchema(widgetId: string): z.ZodType | undefined {
  return widgetSchemaRegistry.get(widgetId);
}
```

Import widget schemas from `@open-edu/widgets`. Check each widget in `packages/widgets/src/builtins/<WidgetName>/` for its exported config schema. Try importing like:

```typescript
import { fractionVisualSchema } from '@open-edu/widgets/builtins/FractionVisual';
```

If a widget's schema is not exported from the package, register a loose fallback schema (`z.record(z.unknown())`) for that widget. The priority is getting the system working — schema fidelity can be improved later.

Register all available widgets in the widget-schemas.ts module scope.

### Update `stepOutputSchema()` — add `widget` case:

```typescript
case 'widget':
  return z.object({
    type: z.literal('widget'),
    widgetId: z.string().min(1),
    widgetConfig: z.record(z.unknown()),
    content: readingContentSchema, // description + instructions as fallback
  });
```

### Update `generateStep()` — validate widget config:

After the LLM returns a `widget`-type result, before constructing the `GeneratedActivity`:

```typescript
if (type === 'widget') {
  const widgetSchema = getWidgetSchema(result.widgetId as string);
  if (widgetSchema) {
    const parseResult = widgetSchema.safeParse(result.widgetConfig);
    if (!parseResult.success) {
      if (attempt < maxRetries) {
        lastErrors = [`Widget '${result.widgetId}' config invalid: ${parseResult.error.message}`];
        lastAttempt = result;
        continue; // retry with LLM
      }
      // Fall back to reading type
      type = 'reading';
      result.type = 'reading';
    } else {
      result.widgetConfig = parseResult.data;
    }
  }
}
```

### Tests:

Create `packages/pipeline/src/generate-activities/__tests__/widget-schemas.test.ts`:

1. Registry stores and retrieves schemas
2. Valid widget config passes validation
3. Invalid widget config triggers retry or reading fallback
4. Unknown widget ID skips validation (no crash)

## Deliverables

- [x] Implementation (widget schemas + updated generator)
- [x] Automated tests
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/pipeline build
pnpm --filter @open-edu/pipeline test
pnpm --filter @open-edu/pipeline lint
pnpm --filter @open-edu/pipeline typecheck
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-01](./VIS-01.md)
- [Detailed story](../docs/EPIC_VISUAL_PIPELINE.md#story-vis-03-add-widget-content-schema--validation-to-activity-generator)
