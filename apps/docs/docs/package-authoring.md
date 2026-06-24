---
sidebar_position: 4
---

# Package Authoring Guide

Learn how to create educational packages for the Open-Edu Framework.

## Quick Start with CLI

The fastest way to create a new package:

```bash
edu create ./my-lesson --id my-lesson --title "My Lesson" --author "Me"
```

This generates a valid package with `package.json`, `workflow.json`, `nodes/intro.md`, and a validation test.

## Minimal Package Structure

A valid package is a directory with at least a `package.json` manifest and one content node:

```
my-package/
├── package.json
├── workflow.json
└── nodes/
    └── lesson.md
```

## Manifest Fields

```json
{
  "id": "my-lesson",
  "title": "My Lesson",
  "version": "0.1.0",
  "author": "Your Name",
  "entry": "nodes/lesson.md"
}
```

### Required Fields

| Field     | Description                        | Example                     |
| --------- | ---------------------------------- | --------------------------- |
| `id`      | Unique kebab-case identifier       | `intro-to-variables`        |
| `title`   | Human-readable display name        | `Introduction to Variables` |
| `version` | Semantic version                   | `1.0.0`                     |
| `author`  | Creator name or organization       | `Open-Edu Team`             |
| `entry`   | Relative path to the starting node | `nodes/lesson.md`           |

## Node Types

### Lesson Node (`.md`)

```markdown
# Lesson Title

Content goes here. Use standard Markdown.
```

### Quiz Node (`.json`)

```json
{
  "type": "quiz",
  "question": "What is 2 + 2?",
  "options": [
    { "id": "a", "text": "3", "correct": false },
    { "id": "b", "text": "4", "correct": true }
  ]
}
```

### Reflection Node (`.json`)

```json
{
  "type": "reflection",
  "prompt": "What did you learn from this lesson?"
}
```

### Exercise Node (`.json`)

```json
{
  "type": "exercise",
  "widget": "open-edu.multiple-choice-practice",
  "config": {
    "prompt": "Select the correct answer.",
    "options": [
      { "id": "a", "text": "Option A", "correct": true },
      { "id": "b", "text": "Option B", "correct": false }
    ]
  }
}
```

### Custom Node with Remote Widget

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

## Skills Graph

Define skills and their dependencies in `skills.json`:

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

Reference skills in the manifest to enable skill tracking:

```json
{
  "id": "my-lesson",
  "title": "My Lesson",
  "version": "0.1.0",
  "author": "Your Name",
  "entry": "nodes/intro.md",
  "skills": ["skills.json"]
}
```

## Workflow Examples

### Linear Progression

```json
{
  "routing": {
    "nodes/intro.md": { "onComplete": "nodes/quiz.json" },
    "nodes/quiz.json": { "onComplete": "COMPLETED" }
  }
}
```

### Score-Based Branching

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

### Skill-Based Branching

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

### Remediation Loop

```json
{
  "routing": {
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "COMPLETED" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    },
    "nodes/remediation.md": {
      "onComplete": "nodes/quiz.json"
    }
  }
}
```

## Rewards

### Simple Reward

```json
{
  "triggers": [
    {
      "onEvent": "workflow.complete",
      "rewards": [{ "action": "badge.award", "badge": "lesson-complete" }]
    }
  ]
}
```

### Conditional Reward

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

## Validation and Linting

```bash
# Schema validation
edu validate ./my-package

# Content quality checks
edu lint-content ./my-package

# Integrity verification
edu validate --verify-integrity ./my-package
```

## Patching Existing Packages

Apply surgical edits without regenerating the entire package:

```bash
# Dry run to see what would change
edu patch ./my-package ./patch.json --dry-run

# Apply the patch (validates before writing)
edu patch ./my-package ./patch.json
```

Patch operations: `add`, `remove`, `replace` (JSON Pointer paths), `upsert-node`, `remove-node`.

## Telemetry Reporting

```bash
# Human-readable summary
edu report ./telemetry.jsonl

# Machine-readable JSON
edu report ./telemetry.jsonl --json
```

## Common Mistakes

- **Missing required manifest fields** — Every `package.json` needs `id`, `title`, `version`, `author`, `entry`.
- **Incorrect entry path** — Use relative paths like `nodes/lesson.md`, not absolute paths.
- **Invalid quiz structure** — Every quiz needs a `question` and `options` array with at least one correct answer.
- **Unreferenced nodes** — All nodes in `workflow.json` routing must exist on disk.
- **Wrong terminal state** — The terminal route must be `COMPLETED` (uppercase).
- **JSON formatting** — Ensure all `.json` files are valid JSON.
- **Skill dependency typos** — Skill IDs in `dependencies` and `assessments` must match defined skill IDs.
- **Circular skill dependencies** — Skills must not depend on each other in a cycle.

## Instructions for AI Agents

### Deterministic Generation Rules

1. Always produce a complete, valid package with `package.json`, at least one node, and `workflow.json`.
2. Use kebab-case for the package `id`.
3. Version must be semver (e.g., `1.0.0`).
4. All paths are relative to the package root.
5. Entry point must be a valid node file (`.md` or `.json`).
6. Quiz nodes must have at least one correct answer.
7. Workflow routing keys must match node file paths exactly.
8. The terminal route is always `COMPLETED`.
9. Rewards should use `badge.award` action only unless webhooks or scripts are explicitly requested.
10. Keep content short and deterministic.
11. Use `edu generate --from-description` for AI-assisted package creation.

### Validation Checklist

- [ ] `package.json` has all 5 required fields
- [ ] `entry` node exists on disk
- [ ] All nodes in `workflow.json` exist on disk
- [ ] Quiz nodes have at least one correct option
- [ ] No circular routes (unless intentional remediation loop)
- [ ] `COMPLETED` is the terminal state
- [ ] JSON files are valid JSON
- [ ] All paths use forward slashes
- [ ] Skill IDs in `dependencies` and `assessments` are defined
- [ ] Remote widget URLs use HTTPS
