# Skill: course-spec-generator

Generate OpenEdu `course-spec.json` files for the course-compiler using an LLM. This skill is optimized for direct LLM consumption — no CLI commands, no markdown output, no pipeline integration. Produces a single-shot valid JSON spec.

## JSON Schema (REQUIRED — output MUST conform exactly)

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-07-28T00:00:00.000Z",
  "metadata": {
    "title": "Course Title",
    "description": "Course description (1-3 sentences)",
    "author": "Author Name",
    "version": "1.0.0",
    "difficulty": "beginner",
    "estimatedHours": 2,
    "generated": true
  },
  "lessons": [
    {
      "id": "lesson-01",
      "title": "Lesson Title",
      "objectives": ["Objective 1", "Objective 2"],
      "coreIdea": "The main concept in 1-2 sentences",
      "examples": ["Example 1", "Example 2"],
      "misconceptions": ["Misconception 1", "Misconception 2"],
      "estimatedMinutes": 15,
      "activities": [
        {
          "step": "observe",
          "order": 1,
          "type": "reading",
          "description": "Introduction to the concept",
          "instructions": "Full reading content here. Use markdown for formatting."
        },
        {
          "step": "guided_practice",
          "order": 2,
          "type": "widget",
          "description": "Interactive practice description",
          "widgetId": "core.matching",
          "widgetConfig": {}
        },
        {
          "step": "mastery_check",
          "order": 3,
          "type": "quiz",
          "description": "Check understanding",
          "questions": [
            {
              "question": "Question text?",
              "options": ["A", "B", "C", "D"],
              "correctIndex": 0
            }
          ]
        }
      ]
    }
  ]
}
```

**Required fields** (validator will error if missing):

- `format` = `"openedu-course-spec"` (literal)
- `version` = `1` (literal)
- `generatedAt` = ISO 8601 timestamp
- `metadata.title`, `metadata.description`
- At least one lesson in `lessons[]`
- Each lesson: `id`, `title`, `objectives[]`, `coreIdea`, `activities[]`
- Each activity: `step` (one of 5 values), `order` (1-based), `type`, `description`
- Widget activity: `widgetId` (from catalog below), `widgetConfig` (object matching widget schema)
- Quiz activity: `questions[]` with exactly 4 options and `correctIndex` 0-3

**Optional fields** (include when relevant):

- `metadata.author`, `metadata.version`, `metadata.difficulty`, `metadata.estimatedHours`
- Lesson: `examples[]`, `misconceptions[]`, `estimatedMinutes`
- Reading activity: `instructions` (markdown content)
- Widget activity: `widgetConfig` (schema varies by widget — see catalog)

## Activity Types & Required Fields

| Type         | Required Fields                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| `reading`    | `instructions` (content), `description`                                       |
| `exercise`   | `instructions`, `description`                                                 |
| `quiz`       | `questions[]` (each: `question`, `options[4]`, `correctIndex`), `description` |
| `reflection` | `instructions` (prompt), `description`                                        |
| `widget`     | `widgetId`, `widgetConfig`, `description`                                     |

## Pedagogical Steps (use exactly these values for `step`)

| Step                   | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `observe`              | Introduce concept (reading, video, audio) |
| `guided_practice`      | Scaffolded practice with hints/feedback   |
| `independent_practice` | Solo practice without hints               |
| `mastery_check`        | Assessment (quiz or widget)               |
| `positive_completion`  | Celebrate & reflect                       |

**Ordering:** Steps must appear in pedagogical order. `order` is 1-based within each lesson. Typical lesson has 3-5 activities.

## 📝 Important Notes for LLMs

**Video Content:** Videos are supported through the `video-player` widget. Use `core.video-player` in a `guided_practice` or `independent_practice` activity to play videos with interactive elements.

**Critical Step Value Format:** All `step` values must be exactly these strings with no extra whitespace or capitalization:

- `observe`
- `guided_practice`
- `independent_practice`
- `mastery_check`
- `positive_completion`

**Example of common error:**

```json
{
  "step": " observe",  // ❌ INCORRECT - leading space
  "order": 1,
  "type": "reading",
  ...
}
```

✅ CORRECT:

```json
{
  "step": "guided_practice",  // ✅ NO extra spaces
  "order": 2,
  "type": "widget",
  ...
}
```

## Widget Catalog (AUTHORITATIVE — use ONLY these IDs)

Widget IDs use domain prefixes. Legacy `open-edu.*` IDs are deprecated and will be rejected by the compiler. Use canonical IDs exactly as listed.

### Core Domain (`core.*`)

| Widget ID              | Purpose                     | Key Config Fields                                                                                                                                 |
| ---------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core.matching`        | Match pairs (itemA ↔ itemB) | `pairs: {itemA, itemB}[]`, `description`, `interactive: boolean`                                                                                  |
| `core.multiple-choice` | Multiple choice questions   | `questions: {question, options[4], correctIndex}[]`, `interactive`                                                                                |
| `core.visual-counting` | Count visual objects        | `description`, `items: {id, label}[]`, `targetCount`, `interactive`                                                                               |
| `core.drag-drop`       | Drag items to target zones  | `items: {id, label, emoji?}[]`, `targets: {id, label}[]`, `expectedPositions: {itemId: targetId}`, `description`, `interactive`                   |
| `core.sequencing`      | Arrange items in order      | `items: {id, label}[]`, `correctOrder: string[]`, `description`, `interactive`                                                                    |
| `core.fill-blank`      | Cloze/fill-in-the-blank     | `template` (with `___` placeholders), `blanks: {id, position, correctAnswer, options?}[]`, `mode: "select"\|"type"`, `description`, `interactive` |
| `core.story-question`  | Reading comprehension       | `scenario` (story text), `questions: {question, options[4], correctIndex}[]`, `interactive`                                                       |
| `core.real-world`      | Real-world application      | `scenario` (context), `taskDescription` (prompt), `interactive`                                                                                   |
| `core.chart-reader`    | Read charts/graphs          | `type: "bar"\|"line"\|"pie"\|"pictograph"`, `data: {label, value}[]`, `title`, `correctLabel`, `description`, `interactive`                       |
| `core.audio-player`    | Audio with questions        | `audio` (URL), `title`, `transcript?`, `captions?`, `duration`, `showTranscript`, `waveform`, `bookmarks`, `interactive`                          |
| `core.video-player`    | Video with questions        | `video` (URL), `poster`, `title`, `transcript?`, `chapters?`, `interactive`                                                                       |
| `core.callout`         | Highlight key info          | `description`, `interactive` (rarely true)                                                                                                        |
| `core.image-compare`   | Spot differences            | `description`, `imageA`, `imageB`, `differences: {id, x, y, radius}[]`, `interactive`                                                             |
| `core.hotspot`         | Tap image regions           | `image` (URL), `hotspots: {id, label, x, y, radius, correct}[]`, `mode: "single"\|"multi"`, `description`, `hints[]`, `interactive`               |
| `core.timeline`        | Chronological events        | `events: {id, title, icon?, description?, image?}[]`, `layout: "vertical"\|"horizontal"`, `showDates`, `showImages`, `interactive`                |

### Math Domain (`math.*`)

| Widget ID                | Purpose                  | Key Config Fields                                                                                                   |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `math.fraction-visual`   | Visualize fractions      | `numerator`, `denominator`, `mode: "circle"\|"bar"\|"number-line"`, `showLabel`, `description`, `interactive`       |
| `math.place-value-chart` | Place value manipulation | `description`, `number` (string), `interactive`                                                                     |
| `math.grid-area`         | Area via grid counting   | `description`, `gridWidth`, `gridHeight`, `shapes: {id, cells: number[], color?}[]`, `maxHighlights`, `interactive` |
| `math.clock-time`        | Analog/digital clock     | `description`, `time` ("HH:MM"), `format: "12h"\|"24h"`, `showDigital`, `interactive`                               |
| `math.measurement-scale` | Measure lengths          | `description`, `objects: {id, label, length, unit}[]`, `unit: "cm"\|"in"`, `interactive`                            |
| `math.number-line`       | Number line exploration  | `description`, `min`, `max`, `step`, `points: {id, position, label}[]`, `interactive`                               |

### Science Domain (`science.*`)

| Widget ID                 | Purpose                    | Key Config Fields                                                                                                              |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------- | -------------------------------------------------------- |
| `science.process-diagram` | Step-by-step process       | `title`, `nodes: {id, title, description?, image?, icon?}[]`, `connections: {from, to, type, label?}[]`, `layout: "horizontal" | "vertical" | "cycle" | "radial"`, `interactive: boolean`, `stepByStep: boolean` |
| `science.label-diagram`   | Drag labels to diagram     | `image` (URL), `labels: {id, text, x, y}[]`, `targets: {id, x, y, radius}[]`, `description`, `interactive`                     |
| `science.image-label`     | Tap image regions to label | `image` (URL), `regions: {id, label, x, y, width, height}[]`, `description`, `interactive`                                     |

### Language Domain (`language.*`)

| Widget ID            | Purpose         | Key Config Fields                                                 |
| -------------------- | --------------- | ----------------------------------------------------------------- |
| `language.flashcard` | Flip-card study | `cards: {front, back}[]`, `shuffle`, `description`, `interactive` |

### Social Domain (`social.*`)

| Widget ID    | Purpose         | Key Config Fields                                                                                                                                                       |
| ------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `social.map` | Interactive map | `regions: {id, name, description, color}[]`, `legend: {color, label}[]`, `markers: {id, label, x, y, icon}[]`, `title`, `labels`, `zoom`, `targetRegion`, `interactive` |

## Widget Config Examples (copy & adapt)

### core.matching

```json
{
  "widgetId": "core.matching",
  "widgetConfig": {
    "description": "Match each animal to its habitat.",
    "pairs": [
      { "itemA": "🐟", "itemB": "Ocean" },
      { "itemA": "🐦", "itemB": "Sky" },
      { "itemA": "🐄", "itemB": "Farm" }
    ],
    "interactive": true
  }
}
```

### core.multiple-choice

```json
{
  "widgetId": "core.multiple-choice",
  "widgetConfig": {
    "questions": [
      {
        "question": "What is 2 + 2?",
        "options": ["3", "4", "5", "6"],
        "correctIndex": 1
      }
    ],
    "interactive": true
  }
}
```

### core.drag-drop

```json
{
  "widgetId": "core.drag-drop",
  "widgetConfig": {
    "description": "Sort items into categories.",
    "items": [
      { "id": "a", "label": "Apple", "emoji": "🍎" },
      { "id": "c", "label": "Carrot", "emoji": "🥕" }
    ],
    "targets": [
      { "id": "fruit", "label": "Fruit" },
      { "id": "veg", "label": "Vegetable" }
    ],
    "expectedPositions": { "a": "fruit", "c": "veg" },
    "interactive": true
  }
}
```

### core.sequencing

```json
{
  "widgetId": "core.sequencing",
  "widgetConfig": {
    "description": "Order the steps.",
    "items": [
      { "id": "s1", "label": "First" },
      { "id": "s2", "label": "Second" }
    ],
    "correctOrder": ["s1", "s2"],
    "interactive": true
  }
}
```

### core.fill-blank

```json
{
  "widgetId": "core.fill-blank",
  "widgetConfig": {
    "description": "Complete the sentence.",
    "template": "The cat ___ on the mat.",
    "blanks": [
      { "id": "b1", "position": 0, "correctAnswer": "sat", "options": ["sat", "ran", "ate"] }
    ],
    "mode": "select",
    "interactive": true
  }
}
```

### core.story-question

```json
{
  "widgetId": "core.story-question",
  "widgetConfig": {
    "scenario": "Maya planted a seed. She watered it daily. A sprout appeared.",
    "questions": [
      {
        "question": "What did Maya do daily?",
        "options": ["Watered it", "Sang to it", "Measured it", "Moved it"],
        "correctIndex": 0
      }
    ],
    "interactive": true
  }
}
```

### core.real-world

```json
{
  "widgetId": "core.real-world",
  "widgetConfig": {
    "scenario": "You need 3 cups of flour per batch. How many cups for 4 batches?",
    "taskDescription": "Calculate and explain your reasoning.",
    "interactive": true
  }
}
```

### core.chart-reader

```json
{
  "widgetId": "core.chart-reader",
  "widgetConfig": {
    "description": "Which category has the highest value?",
    "type": "bar",
    "data": [
      { "label": "Apples", "value": 10 },
      { "label": "Oranges", "value": 7 }
    ],
    "title": "Fruit Count",
    "correctLabel": "Apples",
    "interactive": true
  }
}
```

### core.audio-player

```json
{
  "widgetId": "core.audio-player",
  "widgetConfig": {
    "audio": "assets/audio/intro.wav",
    "title": "Introduction",
    "description": "Listen to the introduction.",
    "transcript": "Full transcript here...",
    "captions": [{ "start": 0, "end": 5, "text": "First sentence." }],
    "duration": 30,
    "showTranscript": true,
    "waveform": true,
    "bookmarks": true,
    "interactive": false
  }
}
```

### core.video-player

```json
{
  "widgetId": "core.video-player",
  "widgetConfig": {
    "video": "assets/video/lesson.mp4",
    "poster": "assets/images/poster.png",
    "title": "Lesson Video",
    "transcript": "Full transcript...",
    "chapters": [
      { "time": 0, "title": "Intro" },
      { "time": 60, "title": "Main Concept" }
    ],
    "interactive": true
  }
}
```

### math.fraction-visual

```json
{
  "widgetId": "math.fraction-visual",
  "widgetConfig": {
    "description": "Visualize 3/4.",
    "numerator": 3,
    "denominator": 4,
    "mode": "circle",
    "showLabel": true,
    "interactive": true
  }
}
```

### math.place-value-chart

```json
{
  "widgetId": "math.place-value-chart",
  "widgetConfig": {
    "description": "Build the number 247.",
    "number": "247",
    "interactive": true
  }
}
```

### math.grid-area

```json
{
  "widgetId": "math.grid-area",
  "widgetConfig": {
    "description": "Find the area of the shape.",
    "gridWidth": 10,
    "gridHeight": 10,
    "shapes": [{ "id": "s1", "cells": [11, 12, 13, 21, 22, 23, 31, 32, 33], "color": "blue" }],
    "maxHighlights": 9,
    "interactive": true
  }
}
```

### math.clock-time

```json
{
  "widgetId": "math.clock-time",
  "widgetConfig": {
    "description": "What time is shown?",
    "time": "03:30",
    "format": "12h",
    "showDigital": true,
    "interactive": true
  }
}
```

### math.measurement-scale

```json
{
  "widgetId": "math.measurement-scale",
  "widgetConfig": {
    "description": "Measure each object.",
    "objects": [
      { "id": "pencil", "label": "Pencil", "length": 15, "unit": "cm" },
      { "id": "book", "label": "Book", "length": 25, "unit": "cm" }
    ],
    "unit": "cm",
    "interactive": true
  }
}
```

### math.number-line

```json
{
  "widgetId": "math.number-line",
  "widgetConfig": {
    "description": "Locate the numbers on the line.",
    "min": 0,
    "max": 20,
    "step": 1,
    "points": [
      { "id": "p1", "position": 5, "label": "5" },
      { "id": "p2", "position": 12, "label": "12" }
    ],
    "interactive": true
  }
}
```

### science.process-diagram

```json
{
  "widgetId": "science.process-diagram",
  "widgetConfig": {
    "title": "The Water Cycle",
    "nodes": [
      {
        "id": "evaporation",
        "title": "Evaporation",
        "description": "The sun heats water, turning it into vapor"
      },
      {
        "id": "condensation",
        "title": "Condensation",
        "description": "Water vapor cools and forms clouds"
      },
      {
        "id": "precipitation",
        "title": "Precipitation",
        "description": "Water falls as rain, snow, or hail"
      },
      {
        "id": "collection",
        "title": "Collection",
        "description": "Water gathers in oceans, lakes, and rivers"
      },
      {
        "id": "transpiration",
        "title": "Transpiration",
        "description": "Plants release water vapor into the air"
      }
    ],
    "connections": [
      { "from": "evaporation", "to": "condensation", "label": "vapor rises" },
      { "from": "condensation", "to": "precipitation", "label": "clouds form" },
      { "from": "precipitation", "to": "collection", "label": "water falls" },
      { "from": "collection", "to": "evaporation", "type": "loop", "label": "cycle repeats" },
      { "from": "transpiration", "to": "condensation", "type": "dashed", "label": "water vapor" }
    ],
    "layout": "cycle",
    "stepByStep": true,
    "interactive": true
  }
}
```

### science.label-diagram

```json
{
  "widgetId": "science.label-diagram",
  "widgetConfig": {
    "image": "assets/images/plant.png",
    "labels": [
      { "id": "leaf", "text": "Leaf", "x": 100, "y": 50 },
      { "id": "root", "text": "Root", "x": 100, "y": 200 }
    ],
    "targets": [
      { "id": "leaf", "x": 100, "y": 50, "radius": 30 },
      { "id": "root", "x": 100, "y": 200, "radius": 30 }
    ],
    "description": "Drag each label to the correct part.",
    "interactive": true
  }
}
```

### science.image-label

```json
{
  "widgetId": "science.image-label",
  "widgetConfig": {
    "image": "assets/images/cell.png",
    "regions": [
      { "id": "nucleus", "label": "Nucleus", "x": 150, "y": 150, "width": 40, "height": 40 },
      { "id": "mito", "label": "Mitochondria", "x": 200, "y": 180, "width": 30, "height": 20 }
    ],
    "description": "Tap each part to identify it.",
    "interactive": true
  }
}
```

### language.flashcard

```json
{
  "widgetId": "language.flashcard",
  "widgetConfig": {
    "description": "Study these vocabulary words.",
    "cards": [
      { "front": "Hello", "back": "Hola" },
      { "front": "Goodbye", "back": "Adiós" }
    ],
    "shuffle": true,
    "interactive": true
  }
}
```

### social.map

```json
{
  "widgetId": "social.map",
  "widgetConfig": {
    "regions": [
      {
        "id": "na",
        "name": "North America",
        "description": "Northern continent",
        "color": "var(--oe-color-primary)"
      },
      {
        "id": "sa",
        "name": "South America",
        "description": "Southern continent",
        "color": "var(--oe-color-success)"
      }
    ],
    "legend": [
      { "color": "var(--oe-color-primary)", "label": "North America" },
      { "color": "var(--oe-color-success)", "label": "South America" }
    ],
    "markers": [{ "id": "nyc", "label": "New York", "x": 25, "y": 35, "icon": "🏙️" }],
    "title": "Continents",
    "labels": true,
    "zoom": true,
    "targetRegion": "na",
    "interactive": true
  }
}
```

## Validation Rules (compiler enforces these)

| Rule                                            | Severity |
| ----------------------------------------------- | -------- |
| Duplicate lesson IDs within course              | error    |
| Missing lesson `title`                          | error    |
| Missing lesson `objectives` (empty array)       | warning  |
| Empty `activities` array                        | warning  |
| Quiz activity with no questions                 | error    |
| Quiz question not exactly 4 options             | error    |
| Quiz question `correctIndex` not 0-3            | error    |
| Widget activity missing `widgetId`              | error    |
| Widget activity `widgetId` not in catalog       | error    |
| Invalid `step` value (not one of 5)             | error    |
| Activity `order` not sequential 1..N per lesson | error    |

## ID Rules

- Lesson IDs: kebab-case, unique within course (e.g., `lesson-01`, `intro-to-fractions`)
- Activity `order`: 1-based integer, sequential per lesson
- Widget IDs: exact match from catalog above (case-sensitive)

## Example Complete Lesson (minimal valid)

```json
{
  "id": "lesson-01",
  "title": "Understanding Fractions",
  "objectives": ["Identify numerator and denominator", "Represent fractions visually"],
  "coreIdea": "A fraction represents parts of a whole. The denominator shows total parts; the numerator shows how many parts we have.",
  "examples": ["1/2 = one half", "3/4 = three quarters"],
  "misconceptions": ["Bigger denominator means bigger fraction"],
  "estimatedMinutes": 20,
  "activities": [
    {
      "step": "observe",
      "order": 1,
      "type": "reading",
      "description": "Read about fractions",
      "instructions": "A fraction has two numbers: the **numerator** (top) and **denominator** (bottom)."
    },
    {
      "step": "guided_practice",
      "order": 2,
      "type": "widget",
      "description": "Visualize fractions",
      "widgetId": "math.fraction-visual",
      "widgetConfig": {
        "description": "Shade 3 out of 4 parts.",
        "numerator": 3,
        "denominator": 4,
        "mode": "circle",
        "showLabel": true,
        "interactive": true
      }
    },
    {
      "step": "mastery_check",
      "order": 3,
      "type": "quiz",
      "description": "Check understanding",
      "questions": [
        {
          "question": "In 3/5, what does the 5 represent?",
          "options": ["Parts we have", "Total parts", "The answer", "Nothing"],
          "correctIndex": 1
        }
      ]
    }
  ]
}
```

## Generation Checklist (verify before output)

- [ ] `format` = `"openedu-course-spec"` and `version` = `1`
- [ ] `generatedAt` is valid ISO 8601 (use current time)
- [ ] `metadata.title` and `metadata.description` present
- [ ] At least one lesson in `lessons[]`
- [ ] Each lesson has unique `id`, `title`, non-empty `objectives[]`, `coreIdea`, `activities[]`
- [ ] Each activity has valid `step`, sequential `order`, valid `type`, `description`
- [ ] Reading activities have `instructions` (markdown content)
- [ ] Widget activities have valid `widgetId` from catalog and matching `widgetConfig`
- [ ] Quiz activities have `questions[]` with exactly 4 options and `correctIndex` 0-3
- [ ] No duplicate lesson IDs
- [ ] All strings properly JSON-escaped
- [ ] No trailing commas
- [ ] Output is ONLY the JSON object — no markdown, no explanation, no extra text
