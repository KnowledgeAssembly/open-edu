---
sidebar_position: 3
---

# Package Format

## Package Structure

Every educational experience is distributed as a self-contained directory:

```
my-package/
├── package.json         # Manifest — id, title, version, author, entry
├── workflow.json        # Routing — how learners navigate between nodes
├── rewards.json         # Rewards — badges, webhooks, scripts (optional)
├── nodes/               # Content — markdown lessons, JSON quizzes/reflections
│   ├── intro.md
│   ├── quiz.json
│   └── reflection.json
├── assets/              # Static files — images, etc. (optional)
└── widgets/             # Custom widget implementations (optional)
```

## Package Manifest

Required fields in `package.json`:

| Field     | Description                                     |
| --------- | ----------------------------------------------- |
| `id`      | kebab-case identifier                           |
| `title`   | Human-readable name                             |
| `version` | Semver string (e.g. `0.1.0`)                    |
| `author`  | Creator name                                    |
| `entry`   | Path to the first node (e.g. `nodes/lesson.md`) |

Example:

```json
{
  "id": "intro-to-variables",
  "title": "Introduction to Variables",
  "version": "1.0.0",
  "author": "Open-Edu",
  "entry": "nodes/lesson-01.md"
}
```

## Node Types

| Type         | File    | Description                       |
| ------------ | ------- | --------------------------------- |
| `lesson`     | `.md`   | Markdown content (auto-detected)  |
| `quiz`       | `.json` | Multiple-choice with scoring      |
| `reflection` | `.json` | Open-ended text prompt            |
| `exercise`   | `.json` | Widget-based interactive exercise |
| `custom`     | `.json` | Arbitrary widget integration      |

### Lesson Node

Markdown files are automatically rendered as lesson nodes:

```markdown
# Variables

Variables store values in memory.
```

### Quiz Node

Multiple choice assessment with correct/incorrect options:

```json
{
  "type": "quiz",
  "question": "Which keyword creates a constant?",
  "options": [
    { "id": "a", "text": "var", "correct": false },
    { "id": "b", "text": "const", "correct": true }
  ]
}
```

### Reflection Node

Open-ended prompt for learner reflection:

```json
{
  "type": "reflection",
  "prompt": "Describe what you learned."
}
```

### Exercise Node

Widget-based interactive exercise:

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "What is the capital of France?",
    "options": [
      { "id": "a", "text": "London", "correct": false },
      { "id": "b", "text": "Paris", "correct": true }
    ]
  }
}
```

## Workflow Routing

### Linear Progression

```json
{
  "routing": {
    "nodes/intro.md": { "onComplete": "nodes/quiz.json" },
    "nodes/quiz.json": { "onComplete": "COMPLETED" }
  }
}
```

### Conditional Branching

```json
{
  "routing": {
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "nodes/advanced.md" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    }
  }
}
```

## Rewards

### rewards.json

```json
{
  "triggers": [
    {
      "onEvent": "workflow.complete",
      "rewards": [{ "action": "badge.award", "badge": "course-complete" }]
    }
  ]
}
```

### Supported Actions

- **badge.award** — Award a named badge
- **webhook** — Send a POST request to a URL
- **script** — Execute a shell script (requires `--allow-shell-hooks`)
