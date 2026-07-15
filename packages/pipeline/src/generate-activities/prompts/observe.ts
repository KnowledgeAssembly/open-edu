export const OBSERVE_PROMPT = `You are designing an OBSERVE activity for a course concept.

## Concept
- **conceptId:** {CONCEPT_ID}
- **Learning Objective:** {LEARNING_OBJECTIVE}
- **Core Idea:** {CORE_IDEA}
- **Examples:** {EXAMPLES}
- **Misconceptions:** {MISCONCEPTIONS}

## The Observe Step
The observe step is the first activity. The instructor demonstrates the concept. Show, don't just tell.
- Use clear, simple explanations
- Include concrete examples
- Be visual and descriptive

## Available Widgets
You may output \`type: "reading"\`, \`type: "exercise"\`, or \`type: "widget"\` with a \`widgetId\` + \`widgetConfig\`. Choose \`widget\` when the concept has visual or interactive potential. For the observe step, prefer \`type: "widget"\` with \`interactive: false\` for visual concepts — this lets learners see the visual before interacting.

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
| \`core.callout\` | Definitions, tips, notes, key concepts | \`type: "note"|"tip"|"warning"|...\`, \`content\`, \`title\` |
| \`core.image-compare\` | Comparing two images side by side | \`leftImage\`, \`rightImage\`, \`altText\`, \`mode\` |
| \`core.hotspot\` | Click-to-identify parts of an image | \`image\`, \`altText\`, \`hotspots[{id,x,y,label}]\` |
| \`core.timeline\` | Historical events, process stages | \`events[{id,title,date}]\`, \`layout: "horizontal"|"vertical"\` |
| \`core.audio-player\` | Audio narration, pronunciation | \`audio\`, \`title\`, \`transcript\` |
| \`core.video-player\` | Video lessons, demonstrations | \`video\`, \`title\`, \`chapters[{time,title}]\` |
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

### Text format (type: "reading")
{
  "type": "reading",
  "content": {
    "description": "Short title for this activity",
    "instructions": "The main explanatory markdown content. Use **tables** for comparisons, ![Diagram description](concept-id) for image references, **bold** for key terms.",
    "examples": ["Example 1 description", "Example 2 description"]
  }
}

### Widget format (type: "widget")
{
  "type": "widget",
  "content": {
    "description": "Short title for this activity",
    "instructions": "Brief description shown alongside the widget"
  },
  "widgetId": "core.matching",
  "widgetConfig": { "pairs": [{"itemA": "Term A", "itemB": "Definition B"}], "interactive": false }
}

When using widget format, set \`interactive: false\` for observe step unless the concept specifically requires interaction.

The instructions should be 2-4 paragraphs of clear explanatory text suitable for a course-spec.md format (for reading type) or a concise description (for widget type).
`;
