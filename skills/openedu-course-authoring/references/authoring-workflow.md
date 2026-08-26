# Authoring Workflow

The skill follows a staged generation sequence. Each stage produces an artifact that informs the next.

## Modes

### Portable Mode (no Open-Edu repository detected, or no executable CLI)

1. **Interview** → gather topic, learner level, goals, language, duration, prerequisites, accessibility needs, source materials
2. **Brief** → `course-brief.md` records all assumptions explicitly
3. **Objectives** → derive measurable learning objectives from goals
4. **Lesson Blueprints** → `lesson-blueprints.json` defining each lesson's structure
5. **Generate Spec** → produce `course-spec.json` and `course-spec.md`
6. **Quality Report** → `quality-report.json` via `validate-course-spec.mjs` with `validationMode: "structural-only"`. Compiler/package phases skipped.
7. **Summary** → agent reports artifact locations and validation instructions

### Repository Mode (Open-Edu tooling detected with executable CLI)

Same as portable mode, plus:
5a. **Widget Selection** → choose widgets from discovered catalog by learning intent
5b. **Package Compilation** → `validate-package.mjs` orchestrates compile → validate → lint in sequence
5c. **Quality Report** → `quality-report.mjs` merges findings from all phases (structural, compiler, validation, lint) into the central `quality-report.json`

## Stage Details

### Stage 1: Input Interview

The agent MUST obtain or explicitly assume:

- **Topic/Subject** — What is being taught
- **Learner Age/Level** — Target grade/age range
- **Learning Goals** — 3-6 specific things learners should achieve
- **Language/Locale** — Content language (default: `en`)
- **Expected Duration** — Total course hours or lesson count
- **Prerequisites** — Prior knowledge assumed
- **Delivery Constraints** — Self-paced, instructor-led, blended
- **Accessibility Needs** — Screen reader, keyboard-only, reading level
- **Source Materials** — Any PDFs, textbooks, or curriculum documents supplied

Every unstated input becomes an explicit assumption in `course-brief.md`.

### Stage 2: Course Brief

`course-brief.md` structure:

```markdown
# Course Brief: {title}

## Scope

- Topic: ...
- Audience: ...
- Level: ...

## Learning Goals

1. ...
2. ...

## Assumptions

- [Assumption 1]
- [Assumption 2]

## Lesson Outline

1. Lesson 1: ... (estimated 15 min)
2. Lesson 2: ... (estimated 20 min)

## Accessibility Requirements

- ...
```

### Stage 3: Learning Objectives

Each objective must be:

- **Measurable** — uses observable action verbs (identify, explain, calculate, compare, construct)
- **Aligned** — maps to at least one activity and one assessment signal
- **Scoped** — achievable within the lesson duration

### Stage 4: Lesson Blueprints

`lesson-blueprints.json` structure:

```json
[
  {
    "id": "lesson-01",
    "title": "Introduction to Fractions",
    "objectives": ["Identify numerator and denominator", "Represent fractions visually"],
    "coreIdea": "A fraction represents a part of a whole...",
    "examples": ["1/2 of a pizza", "3/4 of a chocolate bar"],
    "misconceptions": ["Larger denominator means larger fraction", "1/3 > 1/2"],
    "estimatedMinutes": 20,
    "activityPlan": [
      { "type": "reading", "step": "observe", "description": "Introduction to fractions" },
      {
        "type": "widget",
        "step": "guided_practice",
        "widgetId": "math.fraction-visual",
        "description": "Shade fractions"
      },
      {
        "type": "exercise",
        "step": "independent_practice",
        "description": "Identify fractions from diagrams"
      },
      { "type": "quiz", "step": "mastery_check", "description": "Fraction identification quiz" }
    ]
  }
]
```

### Stage 5: Generation

Transform lesson blueprints into `course-spec.json` following the artifact contract.
Generate `course-spec.md` as a human-readable export.

### Stage 6: Quality Report

Run structural checks via `validate-course-spec.mjs` and record in `quality-report.json`. In repository mode, `quality-report.mjs` is the central orchestrator that merges findings from all phases. In portable mode, `validate-course-spec.mjs` produces structural-only validation (`validationMode: "structural-only"`).

## Activity Progression

Every lesson should follow this progression:

1. **observe** — introduce concept, show examples (reading, video)
2. **guided_practice** — walk through together (widget with observe mode, exercise with hints)
3. **independent_practice** — learner tries alone (widget interactive, exercise)
4. **mastery_check** — assess understanding (quiz, exercise)
5. **positive_completion** — celebrate, reflect, preview next lesson (reflection)

## Widget Selection Rules

1. Choose widgets by learning intent, not by what's available
2. Prefer stable widgets (status: "stable") over experimental ones
3. Use canonical IDs from the discovered catalog (e.g., `core.matching`, not `open-edu.matching`)
4. Provide `widgetConfig` that matches the widget's required fields
5. Fall back to reading/exercise/quiz when no suitable widget exists
6. Record widget choices and rationale in quality report
7. For community widgets, use `widgetRef` with `source: 'registry'`, mandatory `integrity`, and a native `fallback` — see the [Community Widgets Developer Guide](../../apps/docs/docs/widgets/community-widgets)
