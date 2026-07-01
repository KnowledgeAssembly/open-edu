---
name: '📖 VIS-07: Add WidgetActivitySchema to course-compiler'
title: '[Story] VIS-07: Add WidgetActivitySchema to course-compiler'
labels: ['type:story']
---

# Story VIS-07: Add WidgetActivitySchema to course-compiler

## Objective

Add a `WidgetActivitySchema` to the course-compiler's activity model so widget-type activities can be parsed and validated when reading `course-spec.json` input.

## Context

The course-compiler's `ActivitySchema` is a discriminated union of `ReadingActivitySchema`, `ExerciseActivitySchema`, `DiscussionActivitySchema`, `ReflectionActivitySchema`, and `VideoActivitySchema`. We need to add `WidgetActivitySchema` to represent widget-based activities from the JSON input (VIS-08).

This is a prerequisite for the course-compiler to accept pipeline-generated JSON.

## Scope

- **Allowed**: `packages/course-compiler/src/schemas/course-model.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] `WidgetActivitySchema` is defined with `id`, `type: 'widget'`, `widgetId`, `config`, optional `description`
- [ ] `ActivitySchema` discriminated union includes `WidgetActivitySchema`
- [ ] Valid widget activity parses successfully
- [ ] Missing `widgetId` fails validation
- [ ] Existing activity types still parse correctly

## Technical Notes

In `packages/course-compiler/src/schemas/course-model.ts`, add after `VideoActivitySchema`:

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

Update the discriminated union:

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

If `WidgetActivity` type is needed in exports, add it. Check `packages/course-compiler/src/schemas/index.ts` to see if types are re-exported.

## Tests

Create `packages/course-compiler/src/schemas/__tests__/widget-activity.test.ts`:

1. Valid widget: `parse({ id: 'w1', type: 'widget', widgetId: 'open-edu.matching', config: { pairs: [] } })` → succeeds, `widgetId` is preserved.
2. Missing widgetId: `parse({ id: 'w1', type: 'widget', config: {} })` → fails.
3. Empty config: `parse({ id: 'w1', type: 'widget', widgetId: 'test', config: {} })` → succeeds.
4. Optional description: `parse({ id: 'w1', type: 'widget', widgetId: 'test', config: {}, description: 'Match items' })` → description preserved.
5. Discriminated union: `ActivitySchema.parse({ type: 'reading', content: 'hello' })` → still works.
6. Strict mode rejects extra fields: extra field `foo` causes failure.

## Deliverables

- [x] Implementation (schema + union update)
- [x] Automated tests
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/course-compiler build
pnpm --filter @open-edu/course-compiler test
pnpm --filter @open-edu/course-compiler typecheck
```

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Enables: [VIS-08](./VIS-08.md)
