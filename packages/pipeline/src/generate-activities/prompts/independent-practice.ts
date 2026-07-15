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
You may output \`type: "exercise"\` for text problems or \`type: "widget"\` with \`interactive: true\` for visual interactive practice. Choose \`widget\` when the concept lends itself to matching, sorting, sequencing, filling blanks, labeling, or drag-drop activities. Do NOT include hints in widget config for independent practice.

### Widget List
| Widget ID | Best For | Key Config |
|-----------|----------|------------|
| \`core.matching\` | Matching terms to definitions, concept pairs | \`pairs[{itemA, itemB}]\` |
| \`core.drag-drop\` | Sorting items into categories | \`items[{id,label}]\`, \`targets[{id,label}]\`, \`expectedPositions\` |
| \`core.story-question\` | Narrative/scenario-based comprehension | \`scenario\`, \`questions[{question,options,correctIndex}]\` |
| \`core.visual-counting\` | Counting objects, simple addition | \`count\`, \`emoji\` or \`items[]\` |
| \`core.fill-blank\` | Fill-in-the-blank exercises | \`template\` (with \`___\` blanks), \`blanks[]\` |
| \`core.sequencing\` | Ordering steps or events | \`items[{id,label}]\`, \`correctOrder[id]\` |
| \`core.real-world\` | Real-world scenario + self-assessment | \`scenario\`, \`taskDescription\` |
| \`core.multiple-choice\` | Multiple choice quiz | \`questions[{question,options[],correctIndex}]\` |
| \`core.hotspot\` | Click-to-identify parts of an image | \`image\`, \`altText\`, \`hotspots[{id,x,y,label}]\` |
| \`core.timeline\` | Ordering historical events | \`events[{id,title,date}]\`, \`layout\` |
| \`math.fraction-visual\` | Parts of a whole, fractions | \`numerator\`, \`denominator\`, \`mode: "bar"|"circle"\` |
| \`math.chart-reader\` | Bar charts and pictographs | \`type: "bar"|"pictograph"\`, \`data[{label,value}]\` |
| \`math.clock-time\` | Reading/setting clocks | \`hour\`, \`minute\`, \`mode: "read"|"set"\` |
| \`math.measurement-scale\` | Measuring with ruler/thermometer/cylinder | \`type\`, \`min\`, \`max\`, \`step\`, \`unit\` |
| \`math.place-value-chart\` | Place value (Indian system) | \`maxPlaces: "lakh"|"crore"\`, \`targetNumber\` |
| \`math.grid-area\` | Area/perimeter counting | \`rows\`, \`cols\`, \`mode: "area"|"perimeter"\` |
| \`math.number-line\` | Number line, integer placement | \`min\`, \`max\`, \`step\`, \`target\`, \`mode\` |
| \`science.label-diagram\` | Labeling parts of a diagram | \`image\`, \`labels[{id,text,target{x,y}}]\` |
| \`science.image-label\` | Identifying regions on an image | \`image\`, \`regions[{id,title,x,y}]\` |
| \`science.process-diagram\` | Process flows, cycles, sequences | \`nodes[{id,title}]\`, \`connections[{from,to}]\` |
| \`language.flashcard\` | Vocabulary, memorization | \`cards[{front,back}]\`, \`mode: "flip"|"multiple"\` |
| \`social.map\` | Geography, regional data | \`regions[{id,name}]\`, \`labels\` |

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
  "widgetId": "core.sequencing",
  "widgetConfig": {
    "items": [{"id": "s1", "label": "First step"}, {"id": "s2", "label": "Second step"}],
    "correctOrder": ["s1", "s2"],
    "interactive": true
  }
}

When using widget format, set \`interactive: true\` and do NOT include hints.

The instructions should contain practice problems without hints — the learner should solve these on their own.
`;
