# Skill: course-spec-generator

Generate OpenEdu `course-spec.json` files for the course-compiler using an LLM. This is the CLI prompt reference; **for full authoring workflows (including discovery, validation, quality checks, package compilation, and pipeline integration), use the portable `openedu-course-authoring` skill.**

## Quick Reference

### JSON Format (RECOMMENDED for LLM generation)

```json
{
  "format": "openedu-course-spec",
  "version": 1,
  "generatedAt": "2026-01-01T00:00:00.000Z",
  "metadata": {
    "title": "Course Title",
    "description": "Course description",
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
      "coreIdea": "The main concept",
      "examples": ["Example 1"],
      "misconceptions": ["Misconception 1"],
      "estimatedMinutes": 15,
      "activities": [
        {
          "step": "observe",
          "order": 1,
          "type": "reading",
          "description": "Introduction to the concept"
        },
        {
          "step": "guided_practice",
          "order": 2,
          "type": "widget",
          "description": "Interactive practice",
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

### Compiler CLI Usage

```bash
# Compile and validate
edu compile course-spec.json --output ./output --validate

# Validate a compiled package
edu validate ./output

# Lint content quality
edu lint-content ./output

# Dev server
edu dev ./output
```

### Activity Types

| Type         | Required Fields                             |
| ------------ | ------------------------------------------- |
| `reading`    | `instructions` (content), `description`     |
| `exercise`   | `instructions`, `description`               |
| `quiz`       | `questions[]` (4 options, one correctIndex) |
| `reflection` | `instructions` (prompt), `description`      |
| `widget`     | `widgetId`, `widgetConfig`, `description`   |

### Pedagogical Steps

| Step                   | Purpose             |
| ---------------------- | ------------------- |
| `observe`              | Introduce concept   |
| `guided_practice`      | Scaffolded practice |
| `independent_practice` | Solo practice       |
| `mastery_check`        | Assessment          |
| `positive_completion`  | Celebrate & reflect |

### Widget Selection

Widget IDs must come from the **discovered widget catalog**, not a hardcoded list. The canonical IDs use domain prefixes:

- `core.*` — general-purpose widgets (matching, multiple-choice, sequencing, drag-drop, fill-blank, story-question, real-world, chart-reader, audio-player, video-player)
- `math.*` — math-specific widgets (fraction-visual, place-value-chart, grid-area, clock-time, measurement-scale, number-line)
- `science.*` — science-specific widgets (process-diagram, label-diagram, image-label)
- `language.*` — language widgets (flashcard)
- `social.*` — social studies widgets (map)

**Important:** Legacy `open-edu.*` IDs (e.g., `open-edu.matching`) are auto-resolved by the compiler but **should not be used in new specs**. Always use the canonical domain-prefixed IDs.

See `skills/openedu-course-authoring/references/repository-adapter.md` for catalog discovery instructions.

### Validation Rules

| Rule                    | Severity |
| ----------------------- | -------- |
| Duplicate lesson IDs    | error    |
| Missing title           | error    |
| Missing objectives      | warning  |
| Empty quiz              | error    |
| Invalid step            | error    |
| Widget without widgetId | error    |
| No activities           | warning  |

### ID Rules

- Lesson IDs: kebab-case, unique within course
- All IDs must be unique within scope

## Using the Portable Skill

For complete workflows (discovery, validation, quality reports, pipeline integration, package compilation), use the `openedu-course-authoring` skill:

```
skills/openedu-course-authoring/SKILL.md
```

The portable skill handles:

- Repository detection and capability discovery
- Widget catalog loading and validation
- Compiler-aware structural + compiler validation
- Quality rubric with pedagogical checks
- PDF pipeline integration with profile resolution
- Package compilation, validation, and linting
