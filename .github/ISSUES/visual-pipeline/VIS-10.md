---
name: '📖 VIS-10: Generate widget JSON nodes in package-generator'
title: '[Story] VIS-10: Generate widget JSON nodes in package-generator'
labels: ['type:story']
---

# Story VIS-10: Generate widget JSON nodes in package-generator

## Objective

When the package generator encounters a `type: 'widget'` activity, write it as a JSON node file matching the runtime's expected format (`{ type: "exercise", widget: "...", config: {...} }`).

## Context

The package generator currently handles:
- `reading` / `exercise` / `discussion` → `.md` files
- `reflection` → `.json` files (ReflectionNode format)
- Quiz → `.json` files (`{ type: "exercise", widget: "open-edu.multiple-choice", config: { questions } }`)

Widget activities should produce JSON files in the same format as quizzes — `{ type: "exercise", widget: widgetId, config: config }`. This is what the runtime's `WidgetRenderer` expects via the widget registry. No runtime changes needed.

## Scope

- **Edit**: `packages/course-compiler/src/generators/package-generator.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] Widget activity produces a `.json` file in the `nodes/` directory
- [ ] Generated JSON has shape `{ type: "exercise", widget: string, title: string, config: object }`
- [ ] Widget activity is added to `nodeFiles[]` for workflow generation
- [ ] Non-widget activities are unaffected
- [ ] Existing tests for reading/quiz/reflection still pass

## Technical Notes

In `packages/course-compiler/src/generators/package-generator.ts`, in `generateSingleModule()`:

Inside the `if (lesson.activities)` loop (around line 73-95), add a `type === 'widget'` branch AFTER the existing `reflection` branch:

```typescript
if (activity.type === 'reflection') {
  // existing reflection handling...
} else if (activity.type === 'widget') {
  // NEW: widget JSON node generation
  const widgetContent = {
    type: 'exercise',
    widget: activity.widgetId,
    title: displayTitle(activity.id, activity.widgetId || 'widget'),
    config: activity.config,
  };
  await writeJson(join(outputDir, `nodes/${slug}.json`), widgetContent);
  nodeFiles.push({
    id: slug,
    title: displayTitle(activity.id, activity.widgetId || activity.type),
    path: `nodes/${slug}.json`,
  });
} else {
  // existing markdown handling for reading/exercise/discussion/video...
}
```

The `displayTitle()` function already handles cleaning up slugs. For widget activities, it will use the `widgetId` (e.g., "open-edu.matching") as the display title.

Make sure `slug` is generated the same way as for other activities (using the `uniqueSlug()` function that already exists).

### Tests

Update or add test in `packages/course-compiler/src/generators/__tests__/package-generator.test.ts`:

1. **Widget activity generates JSON node**: Create a CourseModel with a widget activity, call `generatePackage()`, verify a `.json` file was created.
2. **Widget JSON format**: Read the generated file, verify `{ type: "exercise", widget: "open-edu.matching", config: {...} }`.
3. **Widget alongside other types**: A lesson with reading + widget + quiz generates all three correctly.
4. **Existing tests pass**: All existing test cases unchanged.

## Deliverables

- [x] Implementation (widget JSON node generation)
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
- Depends on: [VIS-08](./VIS-08.md) (for widget activity in CourseModel)
