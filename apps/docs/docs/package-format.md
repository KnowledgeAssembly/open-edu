---
sidebar_position: 3
---

# Package Format

## Package Structure

Every educational experience is distributed as a self-contained directory:

```
my-package/
├── package.json         # Manifest — id, title, version, author, entry, skills
├── workflow.json        # Routing — linear, conditional, skill-based branching
├── rewards.json         # Rewards — badges, conditions, actions (optional)
├── skills.json          # Skill definitions and assessments (optional)
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

### Custom Node with Remote Widget

Nodes can load widgets from remote URLs at runtime:

```json
{
  "type": "custom",
  "remoteWidget": {
    "id": "my-remote-widget",
    "version": "1.0.0",
    "url": "https://example.com/widgets/quiz.js",
    "integrity": "sha256-abc123...",
    "fallback": "open-edu.multiple-choice-practice"
  },
  "config": {
    "prompt": "Interactive exercise from remote source"
  }
}
```

### Skill Assessments

Exercise and custom nodes can assess skills:

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "assessments": [
    { "skillId": "algebra.basics", "weight": 1.0 }
  ],
  "config": {
    "prompt": "What is 2 + 2?",
    "options": [
      { "id": "a", "text": "3", "correct": false },
      { "id": "b", "text": "4", "correct": true }
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

## Skills Graph

Optional `skills.json` defines skills, dependencies, and which nodes assess them:

```json
{
  "skills": [
    {
      "id": "algebra.basics",
      "name": "Algebra Basics",
      "maxScore": 100,
      "dependencies": []
    },
    {
      "id": "algebra.advanced",
      "name": "Algebra Advanced",
      "maxScore": 100,
      "dependencies": ["algebra.basics"]
    }
  ]
}
```

Workflow routes can branch based on skill mastery by referencing the `skills.json` in manifest:

```json
{
  "routing": {
    "nodes/quiz-basics.json": {
      "conditions": [
        { "if": "skill:algebra.basics >= achieved", "then": "nodes/quiz-advanced.json" },
        { "if": "true", "then": "nodes/remediation.md" }
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

### Conditional Rewards

Rewards can include conditions that must be met before dispatching:

```json
{
  "triggers": [
    {
      "onEvent": "node.complete",
      "conditions": [
        { "type": "score", "nodeId": "nodes/quiz.json", "minScore": 80 }
      ],
      "rewards": [{ "action": "badge.award", "badge": "high-scorer" }]
    }
  ]
}
```

Supported condition types: `score`, `skill`, `chain` (completed node IDs), `and`, `or`.

### Supported Actions

- **badge.award** — Award a named badge
- **webhook** — Send a POST request to a URL
- **script** — Execute a shell script (requires `--allow-shell-hooks`)

## Progress Snapshots

The runtime emits and accepts progress snapshots for persistence and resume:

```json
{
  "packageId": "my-lesson",
  "packageVersion": "1.0.0",
  "currentNodeId": "nodes/quiz.json",
  "visitedNodes": ["nodes/intro.md"],
  "scores": { "nodes/quiz.json": 100 },
  "isCompleted": false,
  "updatedAt": "2026-06-24T12:00:00.000Z"
}
```

The dev server persists snapshots to localStorage under key `open-edu:progress:<packageId>:<packageVersion>`.
