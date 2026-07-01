---
name: '📖 VIS-11: Build exemplars + test the full pipeline'
title: '[Story] VIS-11: Build exemplars + test the full pipeline'
labels: ['type:story']
---

# Story VIS-11: Build exemplars + test the full pipeline

## Objective

Add widget-focused exemplars to the few-shot prompt examples. Create integration-level tests verifying the full pipeline produces valid markdown + JSON output with mixed activity types.

## Context

The exemplars in `exemplars.ts` provide the LLM with examples of good output. Currently they only show `reading`, `exercise`, `quiz`, and `reflection` types. We need to add `widget` exemplars showing the LLM how to format widget activities correctly.

Additionally, we need integration tests that verify the end-to-end flow: mock LLM → pipeline → markdown output + JSON output → course-compiler parsing.

## Scope

- **Edit**: `packages/pipeline/src/generate-activities/exemplars.ts`
- **Create**: `packages/pipeline/src/output/__tests__/pipeline-integration.test.ts`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] At least 3 widget exemplars added (matching, drag-drop, sequencing)
- [ ] Exemplar interface updated to include optional `widgetId` and `widgetConfig`
- [ ] Integration test verifies widget activity → markdown output (no raw JSON)
- [ ] Integration test verifies widget activity → JSON output (widgetId + config preserved)
- [ ] Integration test verifies mixed activity types in JSON
- [ ] All tests pass

## Technical Notes

### In `exemplars.ts`:

Update the `Exemplar` interface:

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

Add these exemplars:

1. **Family Types Matching** (observe, widget, `open-edu.matching`):
   - Pairs: Joint↔Multiple generations, Nuclear↔Parents+children, Single-Parent↔One parent

2. **Issues Affecting Girls** (guided_practice, widget, `open-edu.drag-drop`):
   - Items: Female infanticide (⚠️), Less education (📚), Early marriage (💍)
   - Targets: Social Issue, Educational Issue
   - Expected mapping

3. **Ways to Respect Elders** (independent_practice, widget, `open-edu.sequencing`):
   - Items: Listen, Acknowledge, Apply, Thank
   - Correct order

### Integration test (`pipeline-integration.test.ts`):

Create mock `ConceptActivityPair` fixtures and test:

1. **Markdown output has no raw JSON**: A widget activity renders as `### Activity: ... [Widget]` without `"widgetId"` in the markdown
2. **JSON output preserves widget config**: `renderCourseSpecJSON()` keeps `widgetId` and `widgetConfig` intact
3. **Mixed activity types**: A concept with widget + reading + quiz → JSON has all three with correct types
4. **Round-trip through course-compiler**: Generate JSON from pipeline → feed into `parseCourseSpecJSON()` → verify `CourseModel` has correct widget activity

For the round-trip test, dynamically import from `@open-edu/course-compiler` (or inline a simplified JSON parse if cross-package import is not allowed in tests).

## Deliverables

- [x] Implementation (exemplars + integration tests)
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
- Depends on: [VIS-04](./VIS-04.md), [VIS-06](./VIS-06.md), [VIS-10](./VIS-10.md)
