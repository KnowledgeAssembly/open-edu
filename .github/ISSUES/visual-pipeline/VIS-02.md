---
name: '📖 VIS-02: Update LLM prompts with widget catalog + visual instructions'
title: '[Story] VIS-02: Update LLM prompts with widget catalog + visual instructions'
labels: ['type:story']
---

# Story VIS-02: Update LLM prompts with widget catalog + visual instructions

## Objective

Update each of the 5 LLM activity prompts to: (a) include rich visual instructions (tables, image references, structured formatting), and (b) present a widget catalog so the LLM can choose to output `type: "widget"` instead of plain `reading`/`exercise`.

## Context

The current prompts hardcode the output type (e.g., `observe.ts` says `"type": "reading"`). We want the LLM to choose dynamically: either plain text (`reading`, `exercise`) or a visual widget (`widget`). The prompts need to describe available widgets clearly enough for the LLM to make a good choice and generate valid configs.

## Scope

- **Allowed**: All 5 files in `packages/pipeline/src/generate-activities/prompts/`
- **Exclusions**: No other files

## Acceptance Criteria

- [ ] Each prompt contains the shared widget catalog table (14 widgets with IDs, descriptions, key config fields)
- [ ] Each prompt no longer hardcodes a single output `type`
- [ ] `observe.ts` defaults to preferring `widget` with `interactive: false` for visual concepts
- [ ] `guided-practice.ts` and `independent-practice.ts` prefer `widget` with `interactive: true` for practice
- [ ] `mastery-check.ts` adds scenario-based question instructions
- [ ] `positive-completion.ts` suggests real-world visual activity
- [ ] All prompts still compile and export valid string constants

## Technical Notes

### Shared widget catalog (add near top of each prompt after the concept section)

```
## Available Widgets
You may output `type: "reading"`, `type: "exercise"`, or `type: "widget"` with a `widgetId` + `widgetConfig`. Choose `widget` when the concept has visual or interactive potential.

### Widget List
| Widget ID | Best For | Key Config |
|-----------|----------|------------|
| `open-edu.matching` | Matching terms to definitions, concept pairs | `pairs[{itemA, itemB}]` |
| `open-edu.drag-drop` | Sorting items into categories | `items[{id,label}]`, `targets[{id,label}]`, `expectedPositions` |
| `open-edu.story-question` | Narrative/scenario-based comprehension | `scenario`, `questions[{question,options,correctIndex}]` |
| `open-edu.fraction-visual` | Parts of a whole, fractions | `numerator`, `denominator`, `mode: "bar"|"circle"` |
| `open-edu.chart-reader` | Bar charts and pictographs | `type: "bar"|"pictograph"`, `data[{label,value}]` |
| `open-edu.clock-time` | Reading/setting clocks | `hour`, `minute`, `mode: "read"|"set"` |
| `open-edu.measurement-scale` | Measuring with ruler/thermometer/cylinder | `type`, `min`, `max`, `step`, `unit` |
| `open-edu.place-value-chart` | Place value (Indian system) | `maxPlaces: "lakh"|"crore"`, `targetNumber` |
| `open-edu.grid-area` | Area/perimeter counting | `rows`, `cols`, `mode: "area"|"perimeter"` |
| `open-edu.visual-counting` | Counting objects, simple addition | `count`, `emoji` or `items[]` |
| `open-edu.fill-blank` | Fill-in-the-blank exercises | `template` (with `___` blanks), `blanks[]` |
| `open-edu.sequencing` | Ordering steps or events | `items[{id,label}]`, `correctOrder[id]` |
| `open-edu.real-world` | Real-world scenario + self-assessment | `scenario`, `taskDescription` |
| `open-edu.multiple-choice` | Multiple choice quiz | `questions[{question,options[],correctIndex}]` |

### Widget Output Format
When choosing a widget, output:
\`\`\`json
{ "type": "widget", "content": { "description": "...", "instructions": "..." },
  "widgetId": "open-edu.matching",
  "widgetConfig": { ... widget-specific config fields ... } }
\`\`\`

### Text Output Format
When choosing text, use rich markdown: tables for comparisons, `![Diagram: description](concept-id)` for image references, **bold** for key terms.
```

### Per-step customizations

**observe.ts**: Replace "This activity type is 'reading'" with "Prefer `type: "widget"` with `interactive: false` for concepts with visual potential. This lets learners see the visual before interacting."

**guided-practice.ts** and **independent-practice.ts**: Replace the hardcoded type description with "You may choose `type: "exercise"` for text problems or `type: "widget"` with `interactive: true` for visual practice."

**mastery-check.ts**: Add "Include at least 1 scenario-based question (present a real-world situation, then ask a question about it). Each question can optionally include an `explanation` field."

**positive-completion.ts**: Add "Suggest a specific real-world visual activity (e.g., 'Draw a family tree', 'Create a pictograph of your daily routine')."

### Output format section changes

Replace each prompt's rigid JSON template with:

```
## Output Requirements
Generate a JSON object with:
{
  "type": "reading" | "exercise" | "widget",
  "content": {
    "description": "Short title for this activity",
    "instructions": "Main content text (markdown)",
    "examples": ["Optional example 1"]
  },
  // Only when type === "widget":
  "widgetId": "open-edu.matching",
  "widgetConfig": { ... }
}
```

## Deliverables

- [x] Implementation (all 5 prompt files updated)
- [ ] No automated tests (prompt text changes only)
- [ ] Documentation updates (not needed)

## Validation

```bash
pnpm --filter @open-edu/pipeline build
```

Verify each prompt file compiles without syntax errors.

## References

- Parent Epic: [VIS-EPIC](./VIS-EPIC.md)
- Depends on: [VIS-01](./VIS-01.md)
- [Detailed story](../docs/EPIC_VISUAL_PIPELINE.md#story-vis-02-update-llm-prompts-with-widget-catalog--visual-instructions)
