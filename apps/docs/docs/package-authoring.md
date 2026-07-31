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
  "title": "Basic Math Quiz", // optional — shown in course nav
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
  "title": "Lesson Reflection", // optional — shown in course nav
  "prompt": "What did you learn from this lesson?"
}
```

### Exercise Node (`.json`)

```json
{
  "type": "exercise",
  "title": "Practice Exercise", // optional — shown in course nav
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
  "title": "Remote Exercise", // optional — shown in course nav
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
  "title": "Algebra Skills Check", // optional — shown in course nav
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

The `condition` belongs on the reward action, not the trigger:

```json
{
  "triggers": [
    {
      "onEvent": "node.complete",
      "rewards": [
        {
          "action": "badge.award",
          "badge": "high-scorer",
          "condition": { "type": "score", "nodeId": "nodes/quiz.json", "minScore": 80 }
        }
      ]
    }
  ]
}
```

## Cards (Living Knowledge Cards)

Cards are unlockable achievements that persist across sessions, displayed in the Collection Binder:

```json
{
  "cards": [
    {
      "id": "living-things",
      "title": "Living Things",
      "category": "Biology",
      "type": "knowledge",
      "summary": "Learn what makes something alive.",
      "level": 1,
      "maximumLevel": 2,
      "unlock": { "type": "chain", "completedNodeIds": ["nodes/guided-practice.json"] },
      "nextLevel": { "type": "score", "nodeId": "nodes/mastery-check.json", "minScore": 80 }
    }
  ]
}
```

### Card Types

| Type          | Color   | Description              |
| ------------- | ------- | ------------------------ |
| `knowledge`   | Emerald | Conceptual understanding |
| `skill`       | Indigo  | Practiced ability        |
| `achievement` | Amber   | Milestone completion     |
| `exploration` | Teal    | Discovery and curiosity  |
| `mentor`      | Rose    | Teaching others          |

### Unlock Conditions

Reuses the same condition system as rewards:

```json
{ "type": "chain", "completedNodeIds": ["nodes/quiz.json", "nodes/reflection.json"] }
{ "type": "score", "nodeId": "nodes/mastery-check.json", "minScore": 80 }
{ "type": "and", "conditions": [{ "type": "chain", ... }, { "type": "score", ... }] }
```

### Leveling Up

Add a `nextLevel` condition to allow cards to advance from their starting `level` up to `maximumLevel`:

```json
{
  "level": 1,
  "maximumLevel": 3,
  "unlock": { "type": "chain", "completedNodeIds": ["nodes/intro.md"] },
  "nextLevel": { "type": "score", "nodeId": "nodes/advanced-quiz.json", "minScore": 85 }
}
```

## Bundle-Level Rewards and Cards

Multi-module bundles can carry their own rewards and cards. Bundle-level files live at the **bundle root** and are referenced from `bundle.json` via `rewards`/`cards` relative paths:

```
my-bundle/
├── bundle.json       # references "./rewards.json" and "./cards.json"
├── rewards.json      # bundle-level rewards
├── cards.json        # bundle-level cards
└── modules/
    └── module-a/
```

The `bundleCompleted` condition fires when **all** modules in the bundle complete. Condition scope rules mirror the rewards system:

| Level  | Allowed conditions                                                                                                                             |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Module | `stepCompleted`, `exerciseCompleted`, `score`, `chain`, `activityCompleted`, `moduleUnlocked`, `moduleFailed`, `attempts`, `answeredCorrectly` |
| Bundle | `bundleCompleted`, `moduleCompleted`, `skill`, `and`, `or`, `bundleCondition`                                                                  |

Card IDs must be unique across the entire bundle (module + bundle cards) since saved progress is keyed by bare `card.id`.

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
- **Card level exceeds maximumLevel** — Card `level` must not exceed `maximumLevel` (validated by schema).
- **Duplicate card IDs** — All card IDs in `cards.json` must be unique (validated by schema).
- **Unreachable unlock conditions** — Card unlock conditions reference node IDs that must exist in the workflow.

## Agentic AI Workflow

Open-Edu is designed for AI-native creation. The CLI exposes machine-readable output, deterministic patch contracts, and a generation prompt so agents can inspect, create, and modify packages without parsing human-targeted text.

### Getting the Schema Prompt

Before asking an AI to build a package, dump the full agent prompt with all schemas:

```bash
edu generate --prompt
```

This prints a complete template with package structure, all Zod schema fields, workflow patterns, common mistakes, and a fill-in-the-blanks template. Pipe it into your AI conversation:

```bash
edu generate --prompt | pbcopy   # macOS
edu generate --prompt | xclip    # Linux
```

### Quick Scaffolding

Describe your package in plain language:

```bash
edu generate --from-description "A JavaScript variables lesson with a quiz and remediation loop" ./my-lesson
```

The CLI extracts an ID/title, scaffolds the directory, and validates the result.

### Iterative Workflow

For complex packages, iterate through these steps:

**1. Get the prompt** — `edu generate --prompt > prompt.txt` and feed it to your AI agent.

**2. Generate** — Tell the AI what you want:

```
Create an Open-Edu package called "intro-to-variables" that teaches JavaScript variables.
It should have:
- A markdown lesson node (nodes/lesson.md) explaining let, const, var
- A quiz node (nodes/quiz.json) with 3 questions about variable scoping
- A reflection node (nodes/reflection.json) asking what they learned
- Linear workflow: lesson → quiz → reflection → COMPLETED
```

**3. Validate** — `edu validate ./my-package` (add `--json` for machine-readable errors).

**4. Patch surgically** — Make targeted edits without regenerating everything:

```bash
edu patch ./my-package --json - <<'EOF'
[
  { "op": "add", "path": "/options/-", "value": { "id": "d", "text": "block-scoped", "correct": true } }
]
EOF
```

Each patch is validated atomically — if the result doesn't pass `loadPackage()`, changes are rolled back. Use `--dry-run` to preview.

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
10. Cards use the same condition types as rewards (`score`, `chain`, `and`, `or`). `bundleCompleted` and `moduleCompleted` are for bundle-level use only.
11. Keep content short and deterministic.

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

## Agentic Authoring

Prefer the agentic course-authoring skill for generating new courses. It auto-generates valid `course-spec.json`, runs structural validation, and (in repository mode) compiles + validates + lints the package. See the [Agentic Course Authoring guide](./agentic-authoring.md) for details.
