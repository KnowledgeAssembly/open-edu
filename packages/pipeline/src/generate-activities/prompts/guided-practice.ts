export const GUIDED_PRACTICE_PROMPT = `You are designing a GUIDED PRACTICE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Guided Practice Step
The learner tries with hints and support. Provide step-by-step guidance.

## Available Widgets
You may output \`type: "exercise"\` for text problems or \`type: "widget"\` with \`interactive: true\` for visual interactive practice. Choose \`widget\` when the concept lends itself to matching, sorting, sequencing, filling blanks, or drag-drop activities with hints.

### Widget List
| Widget ID | Best For | Key Config |
|-----------|----------|------------|
| \`open-edu.matching\` | Matching terms to definitions, concept pairs | \`pairs[{itemA, itemB}]\` |
| \`open-edu.drag-drop\` | Sorting items into categories | \`items[{id,label}]\`, \`targets[{id,label}]\`, \`expectedPositions\` |
| \`open-edu.story-question\` | Narrative/scenario-based comprehension | \`scenario\`, \`questions[{question,options,correctIndex}]\` |
| \`open-edu.fraction-visual\` | Parts of a whole, fractions | \`numerator\`, \`denominator\`, \`mode: "bar"|"circle"\` |
| \`open-edu.chart-reader\` | Bar charts and pictographs | \`type: "bar"|"pictograph"\`, \`data[{label,value}]\` |
| \`open-edu.clock-time\` | Reading/setting clocks | \`hour\`, \`minute\`, \`mode: "read"|"set"\` |
| \`open-edu.measurement-scale\` | Measuring with ruler/thermometer/cylinder | \`type\`, \`min\`, \`max\`, \`step\`, \`unit\` |
| \`open-edu.place-value-chart\` | Place value (Indian system) | \`maxPlaces: "lakh"|"crore"\`, \`targetNumber\` |
| \`open-edu.grid-area\` | Area/perimeter counting | \`rows\`, \`cols\`, \`mode: "area"|"perimeter"\` |
| \`open-edu.visual-counting\` | Counting objects, simple addition | \`count\`, \`emoji\` or \`items[]\` |
| \`open-edu.fill-blank\` | Fill-in-the-blank exercises | \`template\` (with \`___\` blanks), \`blanks[]\` |
| \`open-edu.sequencing\` | Ordering steps or events | \`items[{id,label}]\`, \`correctOrder[id]\` |
| \`open-edu.real-world\` | Real-world scenario + self-assessment | \`scenario\`, \`taskDescription\` |
| \`open-edu.multiple-choice\` | Multiple choice quiz | \`questions[{question,options[],correctIndex}]\` |

## Output Requirements
Generate a JSON object with one of these formats:

### Text format (type: "exercise")
{
  "type": "exercise",
  "content": {
    "description": "Short title for this practice activity",
    "instructions": "Practice problems with step-by-step guidance and hints. Include 2-3 problems. Use **tables** and \`![Diagram](concept-id)\` for visual references.",
    "examples": ["Problem 1 with solution hint", "Problem 2 with solution hint"]
  }
}

### Widget format (type: "widget")
{
  "type": "widget",
  "content": {
    "description": "Short title for this activity",
    "instructions": "Brief description of what the learner should do"
  },
  "widgetId": "open-edu.drag-drop",
  "widgetConfig": {
    "items": [{"id": "i1", "label": "Item 1", "emoji": "🔤"}],
    "targets": [{"id": "t1", "label": "Target 1"}],
    "expectedPositions": {"i1": "t1"},
    "interactive": true,
    "hints": ["Hint 1", "Hint 2"]
  }
}

When using widget format, set \`interactive: true\` and include \`hints\` for guided practice.

The instructions should contain practice problems with hints or scaffolding to help the learner (for text format).
`;
