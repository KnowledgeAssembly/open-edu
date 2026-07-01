export const INDEPENDENT_PRACTICE_PROMPT = `You are designing an INDEPENDENT PRACTICE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Independent Practice Step
The learner practices on their own with NO hints. This step should be slightly harder than guided practice.

## Available Widgets
You may output \`type: "exercise"\` for text problems or \`type: "widget"\` with \`interactive: true\` for visual interactive practice. Choose \`widget\` when the concept lends itself to matching, sorting, sequencing, filling blanks, or drag-drop activities. Do NOT include hints in widget config for independent practice.

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
    "instructions": "Practice problems for the learner to solve independently. Include 3-4 problems without hints. Use **tables** and \`![Diagram](concept-id)\` for visual references.",
    "examples": ["Problem 1", "Problem 2", "Problem 3"]
  }
}

### Widget format (type: "widget")
{
  "type": "widget",
  "content": {
    "description": "Short title for this activity",
    "instructions": "Brief description of what the learner should do"
  },
  "widgetId": "open-edu.sequencing",
  "widgetConfig": {
    "items": [{"id": "s1", "label": "First step"}, {"id": "s2", "label": "Second step"}],
    "correctOrder": ["s1", "s2"],
    "interactive": true
  }
}

When using widget format, set \`interactive: true\` and do NOT include hints.

The instructions should contain practice problems without hints — the learner should solve these on their own.
`;
