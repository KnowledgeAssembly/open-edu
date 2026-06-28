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
  "assessments": [{ "skillId": "algebra.basics", "weight": 1.0 }],
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
      "conditions": [{ "type": "score", "nodeId": "nodes/quiz.json", "minScore": 80 }],
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

## Multi-Module Bundles

A **bundle** is a collection of standard Open-Edu packages organized as a hierarchical curriculum. Bundles are defined by a `bundle.json` manifest at the root directory.

### Bundle Directory Structure

```
level-b-math/
├── bundle.json                  # Bundle manifest
├── modules/
│   ├── addition_basics/         # Standard Open-Edu package
│   │   ├── package.json
│   │   ├── workflow.json
│   │   └── nodes/
│   ├── addition_carry/          # Depends on addition_basics
│   │   ├── package.json
│   │   └── ...
│   └── adding_fractions/        # Depends on addition_carry
│       ├── package.json
│       └── ...
```

### Bundle Manifest (bundle.json)

```json
{
  "id": "level-b-math",
  "title": "Level B Math",
  "version": "1.0.0",
  "author": "Open-Edu",
  "description": "A three-module math curriculum",
  "modules": [
    {
      "id": "addition_basics",
      "title": "Addition Basics",
      "path": "modules/addition_basics",
      "dependsOn": [],
      "estimatedDuration": 15
    },
    {
      "id": "addition_carry",
      "title": "Addition with Carrying",
      "path": "modules/addition_carry",
      "dependsOn": ["addition_basics"],
      "estimatedDuration": 20
    },
    {
      "id": "adding_fractions",
      "title": "Adding Fractions",
      "path": "modules/adding_fractions",
      "dependsOn": ["addition_carry"],
      "estimatedDuration": 25
    }
  ]
}
```

### Bundle Manifest Fields

| Field         | Description                                |
| ------------- | ------------------------------------------ |
| `id`          | kebab-case bundle identifier               |
| `type`        | Must be `"bundle"` (default)               |
| `title`       | Human-readable name                        |
| `version`     | Semver string (e.g. `1.0.0`)               |
| `author`      | Creator name                               |
| `description` | Optional description                       |
| `modules`     | Ordered array of module references (min 1) |
| `skills`      | Optional list of skills covered            |

### Module Reference Fields

| Field               | Description                                        |
| ------------------- | -------------------------------------------------- |
| `id`                | Module identifier (kebab-case, matches package id) |
| `title`             | Human-readable module name                         |
| `chapterCode`       | Optional chapter code for display                  |
| `path`              | Relative path to the module directory              |
| `dependsOn`         | Array of module IDs that must be completed first   |
| `estimatedDuration` | Optional estimated time in minutes                 |

### Bundle Loading API

```typescript
import { loadBundle, scanBundles, scanAll } from '@open-edu/core';

// Load a single bundle
const bundle = await loadBundle('./examples/level-b-math');

// Discover all bundles in a directory
const bundles = scanBundles('./examples');

// Discover both packages and bundles simultaneously
const { packages, bundles } = scanAll('./examples');
```

### BundleEngine

The `BundleEngine` (from `@open-edu/workflow`) orchestrates per-module `WorkflowEngine` instances:

```typescript
import { BundleEngine } from '@open-edu/workflow';

const engine = new BundleEngine(bundle, { entry: 'addition_basics' });
engine.subscribe((event) => {
  if (event.type === 'module.completed') {
    console.log(`${event.moduleId} completed!`);
  }
});
engine.start('addition_basics');
```

Module status values: `locked`, `unlocked`, `in_progress`, `completed`. The engine evaluates prerequisites on each completion and automatically unlocks dependent modules.

### Bundle Progress Snapshots

```json
{
  "bundleId": "level-b-math",
  "bundleVersion": "1.0.0",
  "currentModuleId": "addition_carry",
  "moduleStatuses": {
    "addition_basics": "completed",
    "addition_carry": "in_progress",
    "adding_fractions": "locked"
  },
  "moduleProgress": {
    "addition_basics": {
      "moduleId": "addition_basics",
      "packageVersion": "1.0.0",
      "currentNodeId": "nodes/quiz.json",
      "visitedNodes": ["nodes/observe.md", "nodes/quiz.json"],
      "scores": { "nodes/quiz.json": 90 },
      "isCompleted": true,
      "completedAt": "2026-06-27T12:00:00.000Z"
    }
  },
  "updatedAt": "2026-06-27T12:30:00.000Z"
}
```

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
