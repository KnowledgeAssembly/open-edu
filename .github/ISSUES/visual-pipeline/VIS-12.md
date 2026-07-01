---
name: '📖 VIS-12: Markdown output renders widget badge'
title: '[Story] VIS-12: Markdown output renders widget badge (instead of raw JSON)'
labels: ['type:story']
---

# Story VIS-12: Markdown output renders widget badge (instead of raw JSON)

## Objective

Update the markdown output renderer to show a clean widget badge for widget-type activities instead of dumping raw JSON or showing nothing.

## Context

Currently `renderActivity()` in `output/index.ts` handles `reading`, `exercise`, `quiz`, and `reflection` types. Widget activities (from VIS-01) would fall through to no handler, producing no output. We need to render a clean human-readable badge with the widget name and a note that the full config is in the JSON file.

The markdown output is primarily for human review and LLM reading — it should be clean and readable without exposing raw JSON configs.

## Scope

- **Edit**: `packages/pipeline/src/output/index.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] Widget activities render as `### Activity: Title [Widget]` with a badge
- [ ] The instructions/description text is displayed below the heading
- [ ] A blockquote note says which widget is used and references `course-spec.json`
- [ ] Raw JSON (`widgetConfig`, `widgetId`) does NOT appear in the markdown
- [ ] Non-widget activities are unchanged

## Technical Notes

In `packages/pipeline/src/output/index.ts`, within `renderActivity()`, add a new branch BEFORE the return statement:

```typescript
function renderActivity(activity: GeneratedActivity, conceptId?: string): string[] {
  const lines: string[] = [];

  // ... existing handlers for mastery_check (quiz), reflection, reading, exercise ...

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
    lines.push(`> 🧩 **Interactive ${widgetName} activity** — full configuration available in \`course-spec.json\``);
    lines.push('');
  }

  return lines;
}
```

The order of branches matters. Place the widget branch after the existing `reflection` branch and before the `reading`/`exercise` fallback.

### Make sure the widget branch is reached

The current control flow uses `else if` chains:
```
if (mastery_check) { ... }
else if (reflection) { ... }
else if (reading) { ... }
else if (exercise) { ... }
```

Add the widget branch as a new `else if` or as an independent `if` before the return. Either works, but an independent `if` at the end is clearest to avoid breaking the existing chain structure.

### Tests

Add to the existing output tests or create `packages/pipeline/src/output/__tests__/markdown-output.test.ts`:

1. **Widget badge rendered**: `renderCourseSpec` with widget activity produces markdown containing `[Widget]`.
2. **Widget name in badge**: Markdown contains the widget name (e.g., "matching").
3. **No raw JSON**: Markdown does NOT contain `"widgetId"` or `"widgetConfig"`.
4. **Instructions present**: The `instructions` field is rendered in the markdown body.
5. **Fallback description**: Widget without `instructions` still produces a heading and badge.

## Deliverables

- [x] Implementation (widget badge in `renderActivity`)
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
- Depends on: [VIS-05](./VIS-05.md) (for JSON output — markdown is complementary)
