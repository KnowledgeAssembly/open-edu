# Skill: course-spec-generator

Generate OpenEdu `course-spec.md` or `course-spec.json` files for the course-compiler using an LLM. Use this whenever you need to create educational content, generate course outlines, design learning experiences, or build structured educational packages for the OpenEdu framework. Covers the full spec format, validation rules, and all 15 built-in widgets with their configuration schemas and usage examples.

## Output Formats

The course-compiler accepts two input formats. **JSON is preferred for LLM generation** since it handles structured data (widgets, quizzes) more precisely. Markdown is better for human-authored specs.

### Format A: course-spec.md (Markdown)

YAML frontmatter between `---` delimiters, followed by hierarchical markdown.

```markdown
---
title: Course Title
description: Course description
author: Author Name
version: 1.0.0
language: en
difficulty: beginner|intermediate|advanced
estimatedHours: 5
keywords: [tag1, tag2]
targetAudience: Description of audience
lastUpdated: 2026-07-06
---

# Module 1: Module Title

Module description paragraph.

## Lesson 1.1: Lesson Title

**Objectives:**

- Objective 1
- Objective 2

Lesson body content — paragraphs, lists, code blocks, images.

### Activity: Reading

Reading content goes here.

### Activity: Exercise

Exercise instructions go here.

### Activity: Discussion

Discussion prompt goes here.

### Activity: Reflection

Reflection prompt goes here. (private: true by default)

### Activity: Video

Video URL goes here.

### Quiz: Quiz Title

1. Question text?

- [x] Correct option
- [ ] Wrong option
- [ ] Wrong option
- [ ] Wrong option

**Glossary:**

- Term: Definition

**References:**

- [Title](url)
```

### Format B: course-spec.json (JSON — RECOMMENDED for LLM output)

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-07-06T00:00:00.000Z",
  "metadata": {
    "title": "Course Title",
    "description": "Course description",
    "author": "Author Name",
    "version": "1.0.0",
    "language": "en",
    "difficulty": "beginner",
    "estimatedHours": 2,
    "keywords": ["tag1", "tag2"],
    "targetAudience": "Description",
    "generated": true
  },
  "lessons": [
    {
      "id": "lesson-101",
      "title": "Lesson Title",
      "objectives": ["Objective 1", "Objective 2"],
      "coreIdea": "The main concept of this lesson",
      "examples": ["Example 1", "Example 2"],
      "misconceptions": ["Misconception 1"],
      "estimatedMinutes": 15,
      "activities": [
        {
          "step": "observe|guided_practice|independent_practice|mastery_check|positive_completion",
          "order": 1,
          "type": "reading|exercise|quiz|reflection|widget",
          "description": "Activity description",
          "instructions": "Content for reading, or detailed instructions for exercises",
          "questions": [
            {
              "question": "Question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correctIndex": 0
            }
          ],
          "widgetId": "open-edu.multiple-choice",
          "widgetConfig": {}
        }
      ]
    }
  ]
}
```

## Course Structure Rules

### Module & Lesson Hierarchy

```
course-spec.md          course-spec.json
─────────────────       ────────────────
# Module 1: Title       metadata.title
  ## Lesson 1.1: Title    lessons[].title
    ### Activity: Type      lessons[].activities[].type
    ### Quiz: Title         lessons[].activities[].type: "quiz"
    **Objectives:**          lessons[].objectives[]
    **Glossary:**            (metadata-level glossary)
    **References:**          (metadata-level references)
```

### ID Generation Rules

- Module IDs: `"Module N"` → `module-N`; otherwise slugified title
- Lesson IDs: `"Lesson N.N"` → `lesson-NN` (dots removed); otherwise slugified
- Activity IDs: auto-generated from title/type
- All IDs must be unique within scope

### Validation Rules (compiler enforces these)

| Rule                    | Severity | Description                                     |
| ----------------------- | -------- | ----------------------------------------------- |
| Duplicate IDs           | error    | No two modules/lessons/quizzes can share an ID  |
| Missing title           | error    | Module or lesson must have a non-empty title    |
| Missing objectives      | warning  | Lessons should have objectives                  |
| Empty quiz              | error    | Quiz must have at least one question            |
| Missing question prompt | error    | Question cannot have empty prompt               |
| < 2 options             | error    | Multiple-choice needs ≥ 2 options               |
| No correct option       | warning  | MCQ should have a marked correct answer         |
| Empty module            | error    | Module must have at least one lesson            |
| Empty lesson            | warning  | Lesson should have content or activities        |
| Broken prerequisite     | error    | Module preref must reference existing module ID |
| Cycle detected          | error    | No circular module dependencies                 |

## Available Activity Types

| Type         | Description             | Fields                                                   |
| ------------ | ----------------------- | -------------------------------------------------------- |
| `reading`    | Informational content   | `instructions` (maps to content field), `description`    |
| `exercise`   | Hands-on practice       | `instructions`, `solution?`, `starterCode?`              |
| `discussion` | Group discussion prompt | `prompt`, `guidedQuestions?`                             |
| `reflection` | Private reflection      | `prompt`, `private: true` (default)                      |
| `video`      | Video content           | `url`, `transcript?`, `duration?`                        |
| `widget`     | Interactive widget      | `widgetId`, `config`, `description?`                     |
| `quiz`       | Assessment              | `questions[]` with `question`, `options`, `correctIndex` |

## Available Widgets (15 built-in)

All widgets use the `exercise` node type with a `widget` field set to the widget ID. The `config` object is widget-specific. Every widget supports an `interactive: true|false` flag — when `false`, it renders in **observe mode** (correct answers pre-displayed, user acknowledges).

### 1. `open-edu.multiple-choice` — Multiple Question Quiz

Multi-question quiz with interactive or observe modes. One question at a time with per-question feedback and final results.

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice",
  "config": {
    "questions": [
      {
        "question": "What is the largest planet?",
        "options": ["Earth", "Mars", "Jupiter", "Saturn"],
        "correctIndex": 2,
        "explanation": "Jupiter is the largest planet in our solar system."
      }
    ],
    "interactive": true
  }
}
```

**Config schema:**

- `questions[]`: Array of question objects
  - `question`: string (required)
  - `options`: string[] (required, ≥ 2)
  - `correctIndex`: number (index of correct option)
  - `explanation?`: string
- `interactive?`: boolean (default: true)

### 2. `open-edu.multiple-choice-practice` — Single Question Practice

Legacy single-question mode with immediate feedback.

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "What is the capital of France?",
    "options": [
      { "id": "a", "text": "London", "correct": false },
      { "id": "b", "text": "Paris", "correct": true },
      { "id": "c", "text": "Berlin", "correct": false },
      { "id": "d", "text": "Madrid", "correct": false }
    ],
    "explanation": "Paris is the capital and largest city of France."
  }
}
```

**Config schema:**

- `prompt`: string (required — the question)
- `options[]`: Array of option objects
  - `id`: string (e.g., "a", "b", "c")
  - `text`: string
  - `correct`: boolean
- `explanation?`: string

### 3. `open-edu.visual-counting` — Count Items

Count items displayed in a grid. Supports simple counting and addition mode.

```json
{
  "type": "exercise",
  "widget": "open-edu.visual-counting",
  "config": {
    "description": "Count the stars!",
    "items": ["⭐"],
    "count": 5,
    "text": "stars",
    "interactive": true
  }
}
```

**Config schema:**

- `description?`: string
- `items?`: string[] — array of emoji/items to display
- `count?`: number — how many items
- `text?`: string — label for what's being counted
- `emoji?`: string — single emoji to auto-generate `count` items
- `size?`: "sm" | "md" | "lg"
- `hint?`: string
- `hints?`: string[]
- `left?`: number — addition mode left operand
- `right?`: number — addition mode right operand
- `sum?`: number — correct sum for addition
- `interactive?`: boolean

For **addition mode**, set `left` + `right` + `sum` instead of `items` + `count`.

### 4. `open-edu.matching` — Pair Matching

Click-to-connect matching with visual SVG connector lines.

```json
{
  "type": "exercise",
  "widget": "open-edu.matching",
  "config": {
    "description": "Match each fruit to its color.",
    "pairs": [
      { "itemA": "🍎", "itemB": "Red" },
      { "itemA": "🍌", "itemB": "Yellow" },
      { "itemA": "🍊", "itemB": "Orange" },
      { "itemA": "🍇", "itemB": "Purple" }
    ],
    "hint": "Think about what color each fruit is.",
    "interactive": true
  }
}
```

**Config schema:**

- `description?`: string
- `pairs[]`: Array of pair objects
  - `id?`: string
  - `itemA`: string (left column)
  - `itemB`: string (right column)
- `hint?`: string
- `hints?`: string[]
- `interactive?`: boolean

### 5. `open-edu.drag-drop` — Drag Items to Targets

Click-based sorting: assign items to target zones.

```json
{
  "type": "exercise",
  "widget": "open-edu.drag-drop",
  "config": {
    "description": "Sort each animal into the correct habitat.",
    "items": [
      { "id": "fish", "label": "🐟 Fish", "emoji": "🐟" },
      { "id": "bird", "label": "🐦 Bird", "emoji": "🐦" },
      { "id": "whale", "label": "🐋 Whale", "emoji": "🐋" },
      { "id": "eagle", "label": "🦅 Eagle", "emoji": "🦅" }
    ],
    "targets": [
      { "id": "sky", "label": "Sky" },
      { "id": "ocean", "label": "Ocean" }
    ],
    "expectedPositions": {
      "fish": "ocean",
      "bird": "sky",
      "whale": "ocean",
      "eagle": "sky"
    },
    "interactive": true
  }
}
```

**Config schema:**

- `description?`: string
- `items[]`: Array of draggable items
  - `id`: string (unique)
  - `label`: string (display text)
  - `emoji?`: string
- `targets[]`: Array of drop zones
  - `id`: string (unique)
  - `label`: string (display text)
- `expectedPositions`: Record<string, string> — maps item ID to target ID
- `hint?`: string
- `hints?`: string[]
- `interactive?`: boolean

### 6. `open-edu.sequencing` — Order Items

Arrange items in the correct sequential order.

```json
{
  "type": "exercise",
  "widget": "open-edu.sequencing",
  "config": {
    "description": "Put the life cycle steps in correct order.",
    "items": [
      { "id": "seed", "label": "🌱 Seed" },
      { "id": "sprout", "label": "🌿 Sprout" },
      { "id": "plant", "label": "🌻 Plant" },
      { "id": "flower", "label": "🌸 Flower" }
    ],
    "correctOrder": ["seed", "sprout", "plant", "flower"],
    "interactive": true
  }
}
```

**Config schema:**

- `description?`: string
- `items[]`: Array of sequencable items
  - `id`: string
  - `label`: string
  - `emoji?`: string
- `correctOrder`: string[] — IDs in correct sequence (required)
- `hint?`: string
- `hints?`: string[]
- `interactive?`: boolean

### 7. `open-edu.fill-blank` — Fill in the Blank

Template-based fill-in-the-blank with dropdown (`select`) or text input (`type`) mode.

```json
{
  "type": "exercise",
  "widget": "open-edu.fill-blank",
  "config": {
    "description": "Complete the sentences about the water cycle.",
    "template": "Water ___ from the ground into the air. It forms ___ in the sky. Then it falls back down as ___.",
    "blanks": [
      {
        "id": "b1",
        "position": 0,
        "correctAnswer": "evaporates",
        "options": ["evaporates", "freezes", "sinks"]
      },
      {
        "id": "b2",
        "position": 1,
        "correctAnswer": "clouds",
        "options": ["rocks", "clouds", "waves"]
      },
      { "id": "b3", "position": 2, "correctAnswer": "rain", "options": ["rain", "sand", "wind"] }
    ],
    "mode": "select",
    "interactive": true
  }
}
```

**Config schema:**

- `description?`: string
- `template`: string — text with `___` placeholders (required)
- `blanks[]`: Array of blank definitions
  - `id`: string (unique)
  - `position`: number (index of the blank, 0-based)
  - `correctAnswer`: string
  - `options?`: string[] — required for `select` mode
- `mode`: "select" | "type" (default: "select")
- `hint?`: string
- `hints?`: string[]
- `interactive?`: boolean
- `prompt?`: string (alternative to template)
- `statement?`: string (pipeline mode)
- `answers?`: string[] (pipeline mode — auto-converted to blanks)

### 8. `open-edu.story-question` — Comprehension Questions

Story-based reading comprehension with multiple questions.

```json
{
  "type": "exercise",
  "widget": "open-edu.story-question",
  "config": {
    "scenario": "Maya planted a sunflower seed in a small pot...",
    "questions": [
      {
        "question": "Where did Maya place the pot?",
        "options": ["In the garden", "By the window", "On the roof", "In the closet"],
        "correctIndex": 1
      }
    ],
    "interactive": true
  }
}
```

**Config schema:**

- `scenario?`: string — the story text
- `story?`: string — alternative to scenario
- `visual?`: string — URL or emoji for visual aid
- `questions[]`: Array of question objects
  - `question`: string
  - `options`: string[] (≥ 2)
  - `correctIndex`: number
  - `explanation?`: string
- `interactive?`: boolean

### 9. `open-edu.real-world` — Real World Task

Open-ended real-world task with self-assessment.

```json
{
  "type": "exercise",
  "widget": "open-edu.real-world",
  "config": {
    "description": "Apply measurement to the real world.",
    "scenario": "You are helping to bake cookies for a school event...",
    "taskDescription": "How many cups of flour will you need in total?",
    "interactive": true
  }
}
```

**Config schema:**

- `scenario`: string (required)
- `taskDescription?`: string — what the learner should do
- `prompt?`: string — alternative prompt
- `expectedAnswer?`: string
- `visualExample?`: string
- `hint?`: string
- `interactive?`: boolean

### 10. `open-edu.fraction-visual` — Fraction Shading

Visual fraction bars or circles with interactive shading.

```json
{
  "type": "exercise",
  "widget": "open-edu.fraction-visual",
  "config": {
    "description": "Shade 3/4 of the circle.",
    "numerator": 3,
    "denominator": 4,
    "mode": "circle",
    "showLabel": true,
    "interactive": true
  }
}
```

**Config schema:**

- `numerator`: number (required — shaded segments)
- `denominator`: number (required — total segments, ≤ 12)
- `mode?`: "bar" | "circle" (default: "bar")
- `label?`: string
- `showLabel?`: boolean
- `size?`: number (pixel size)
- `compare?`: { numerator: number, denominator: number } — comparison mode
- `interactive?`: boolean

### 11. `open-edu.chart-reader` — Bar & Pictograph Charts

Read data from bar charts or pictograph charts.

```json
{
  "type": "exercise",
  "widget": "open-edu.chart-reader",
  "config": {
    "description": "Which sport is the most popular?",
    "type": "bar",
    "data": [
      { "label": "Cricket", "value": 12 },
      { "label": "Football", "value": 8 },
      { "label": "Hockey", "value": 5 }
    ],
    "title": "Favorite Sports",
    "showValues": true,
    "correctLabel": "Cricket",
    "interactive": true
  }
}
```

**Config schema:**

- `type`: "bar" | "pictograph" (discriminator, required)
- `data[]`: Array of data points
  - `label`: string
  - `value`: number
  - `emoji?`: string — used in pictograph mode
- `title?`: string — chart title
- `showValues?`: boolean
- `description?`: string
- `correctLabel?`: string — **required when interactive: true**
- `interactive?`: boolean

### 12. `open-edu.grid-area` — Grid Area/Perimeter

Click cells on a grid to calculate area or perimeter.

```json
{
  "type": "exercise",
  "widget": "open-edu.grid-area",
  "config": {
    "description": "Highlight 6 cells to match the area shown.",
    "rows": 5,
    "cols": 5,
    "mode": "area",
    "maxHighlights": 25,
    "showCount": true,
    "interactive": true
  }
}
```

**Config schema:**

- `rows`: number (required)
- `cols`: number (required)
- `mode?`: "area" | "perimeter" (default: "area")
- `maxHighlights?`: number
- `cellSize?`: number (pixels)
- `showCount?`: boolean
- `highlighted?`: boolean
- `description?`: string
- `interactive?`: boolean

### 13. `open-edu.place-value-chart` — Place Value

Build numbers using a place value chart (Lakh/Crore system).

```json
{
  "type": "exercise",
  "widget": "open-edu.place-value-chart",
  "config": {
    "description": "Build the number 543.",
    "maxPlaces": "lakh",
    "targetNumber": 543,
    "draggableDigits": [5, 4, 3],
    "showLabels": true,
    "interactive": true
  }
}
```

**Config schema:**

- `maxPlaces`: "lakh" | "crore" (required)
  - `lakh`: 6 columns (L, TTh, Th, H, T, O)
  - `crore`: 8 columns (Cr, TL, L, TTh, Th, H, T, O)
- `targetNumber?`: number — the number the learner should construct
- `digits?`: number[] — alternative to targetNumber
- `draggableDigits?`: number[] — digit tiles available
- `showLabels?`: boolean
- `description?`: string
- `interactive?`: boolean

### 14. `open-edu.measurement-scale` — Ruler/Thermometer/Cylinder

Interactive measurement instruments.

```json
{
  "type": "exercise",
  "widget": "open-edu.measurement-scale",
  "config": {
    "description": "Set the thermometer to 25 degrees.",
    "type": "thermometer",
    "min": -10,
    "max": 50,
    "step": 1,
    "unit": "°C",
    "targetValue": 25,
    "showReading": true,
    "showLabels": true,
    "interactive": true
  }
}
```

**Config schema:**

- `type`: "ruler" | "thermometer" | "cylinder" (required)
- `min`: number (required — minimum value)
- `max`: number (required — maximum value)
- `step`: number (required — tick increment)
- `unit`: string (required — e.g., "cm", "°C", "mL")
- `targetValue?`: number — **required when interactive: true**
- `value?`: number — pre-set value
- `showReading?`: boolean
- `showLabels?`: boolean
- `description?`: string
- `interactive?`: boolean

### 15. `open-edu.clock-time` — Analog Clock

Read or set time on an analog clock face.

```json
{
  "type": "exercise",
  "widget": "open-edu.clock-time",
  "config": {
    "description": "Set the clock to show 7:30.",
    "hour": 3,
    "minute": 0,
    "mode": "set",
    "showDigital": true,
    "targetTime": { "hour": 7, "minute": 30 },
    "interactive": true,
    "size": 250
  }
}
```

**Config schema:**

- `hour`: number (required — initial hour, 1–12)
- `minute`: number (required — initial minute, 0–59)
- `mode?`: "read" | "set" (default: "read")
  - `read`: Learner identifies the displayed time
  - `set`: Learner moves hands to match target time
- `showDigital?`: boolean — show digital readout
- `targetTime?`: { hour: number, minute: number } — **required when mode is "set"**
- `size?`: number — clock diameter in pixels
- `interactive?`: boolean

## Widget Activity in JSON course-spec

When using the JSON format, widget activities use `type: "widget"`:

```json
{
  "step": "guided_practice",
  "order": 1,
  "type": "widget",
  "description": "Match the items",
  "instructions": "Match each item to its pair",
  "widgetId": "open-edu.matching",
  "widgetConfig": {
    "pairs": [
      { "itemA": "Apple", "itemB": "Fruit" },
      { "itemA": "Carrot", "itemB": "Vegetable" }
    ],
    "interactive": true
  }
}
```

For quiz activities with multiple-choice questions:

```json
{
  "step": "mastery_check",
  "order": 2,
  "type": "quiz",
  "description": "Check your understanding",
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    }
  ]
}
```

## Lesson Activity Step Types

When using JSON format, each activity has a `step` field that defines its pedagogical role:

| Step                   | Purpose               | When to Use                          |
| ---------------------- | --------------------- | ------------------------------------ |
| `observe`              | Introduce concept     | First exposure, show not tell        |
| `guided_practice`      | Walk through together | Scaffolded practice with support     |
| `independent_practice` | Let learner try alone | After guided practice                |
| `mastery_check`        | Assess understanding  | End of lesson checkpoint             |
| `positive_completion`  | Celebrate success     | Final activity, reflection or reward |

## Widget Selection Guide

| Learning Goal               | Best Widget                                   |
| --------------------------- | --------------------------------------------- |
| Assess knowledge            | `multiple-choice`, `multiple-choice-practice` |
| Vocabulary/concept matching | `matching`                                    |
| Categorization              | `drag-drop`                                   |
| Ordering steps              | `sequencing`                                  |
| Reading comprehension       | `story-question`                              |
| Counting/early math         | `visual-counting`                             |
| Real-world application      | `real-world`                                  |
| Fractions                   | `fraction-visual`                             |
| Data literacy               | `chart-reader`                                |
| Area/perimeter              | `grid-area`                                   |
| Place value                 | `place-value-chart`                           |
| Measurement                 | `measurement-scale`                           |
| Telling time                | `clock-time`                                  |
| Fill vocabulary             | `fill-blank`                                  |

## Compiler CLI Usage

```bash
# Compile markdown spec
edu compile ./course-spec.md -o ./output-dir

# Compile JSON spec
edu compile ./course-spec.json -o ./output-dir

# Validate output against schemas
edu compile ./course-spec.md --validate

# Watch mode
edu compile ./course-spec.md -w
```

## Output Structure

```
out/
├── package.json       # Package manifest (or bundle.json for multi-module)
├── workflow.json      # Node routing graph
├── nodes/             # Content files (.md for lessons, .json for quizzes/widgets)
│   ├── lesson-1.md
│   ├── quiz-1.json
│   └── ...
└── assets/            # Image/media placeholders
    └── *.svg
```

## Best Practices

1. **Objectives first**: Every lesson needs clear, measurable objectives. Use action verbs (identify, explain, calculate, compare).
2. **Progressive difficulty**: Order activities as observe → guided → independent → mastery check → positive completion.
3. **Varied activities**: Mix reading, exercises, quizzes, and widgets within each lesson.
4. **Widget interactivity**: Use `interactive: true` for learner practice, `interactive: false` (observe mode) for demonstrations.
5. **Quiz design**: Exactly one correct answer per MCQ. Provide 3–5 options. Include an explanation for each answer.
6. **Glossary terms**: Define key vocabulary using **Glossary:** section at lesson or module level.
7. **References**: Cite sources using **References:** section with markdown links.
8. **Assets**: Reference images with standard markdown `![alt](path)` syntax — the compiler handles them.
9. **Lesson length**: Keep lessons focused (15–30 minutes estimated). Break longer topics into multiple lessons.
10. **ID uniqueness**: Ensure all module and lesson IDs are unique across the entire spec.
