# Open-Edu Framework Specification

Version: 0.1.0

Status: Draft

---

# 1. Purpose

The Open-Edu Framework is an open, AI-native runtime for building, delivering, and measuring educational experiences.

The framework separates:

- Content
- Learning workflows
- User interfaces
- Accessibility
- Analytics
- Rewards

into independent layers.

Educational packages become portable, reusable, version-controlled assets that can be authored by humans or AI agents and executed by any compatible runtime.

---

# 2. Core Design Principles

## Content First

Educational content must remain independent of presentation technologies.

Packages are defined using:

- Markdown
- JSON
- JSON Schema

rather than custom editors or proprietary formats.

---

## Agentic Authoring

The framework must be easy for AI agents to generate.

All package structures, schemas, and workflows must be deterministic and machine-readable.

A coding agent should be capable of generating a complete educational package from a natural language prompt.

---

## Accessibility By Default

Accessibility is a runtime responsibility.

Package authors describe learning intent.

The runtime guarantees:

- Semantic rendering
- Keyboard navigation
- Screen reader compatibility
- Focus management
- Predictable interaction patterns

---

## Learning Observability

Learning interactions are captured as structured telemetry.

Telemetry enables:

- Progress tracking
- Curriculum analysis
- Skill mastery estimation
- Adaptive routing
- Learning analytics

---

## Extensibility

The framework provides a stable core while allowing custom educational experiences through a plugin architecture.

---

# 3. System Architecture

```text
Educational Package
        │
        ▼
Package Loader
        │
        ▼
Workflow Engine
        │
        ▼
Runtime Renderer
        │
 ┌──────┼──────┐
 ▼      ▼      ▼
A11y  Widgets Telemetry
Engine Engine  Engine
 │              │
 ▼              ▼
Learner      Event Stream
                │
                ▼
         Reward Broker
```

---

# 4. Educational Package

Every educational experience is distributed as a package.

A package is a self-contained directory.

```text
my-package/
│
├── package.json
├── workflow.json
├── rewards.json
│
├── nodes/
│   ├── lesson-01.md
│   ├── quiz-01.json
│   └── reflection-01.json
│
├── assets/
│   ├── images/
│   └── media/
│
└── widgets/
    └── custom-widget/
```

Packages must be portable and executable without modification.

---

# 5. Package Manifest

The package manifest defines package metadata.

## package.json

```json
{
  "id": "intro-to-variables",
  "title": "Introduction to Variables",
  "version": "1.0.0",
  "author": "Open-Edu",
  "entry": "nodes/lesson-01.md"
}
```

## Required Fields

| Field   | Description               |
| ------- | ------------------------- |
| id      | Unique package identifier |
| title   | Human-readable title      |
| version | Semantic version          |
| author  | Package creator           |
| entry   | Starting node             |

---

# 6. Node System

Nodes are the fundamental learning units.

Each node represents a single educational interaction.

---

## Lesson Node

Purpose:

Present educational content.

File Type:

```text
.md
```

Example:

```markdown
# Variables

Variables store values in memory.

## Example

const age = 20
```

Runtime responsibilities:

- Semantic rendering
- Accessibility support
- Reading telemetry

---

## Quiz Node

Purpose:

Assess understanding.

File Type:

```text
.json
```

Example:

```json
{
  "type": "quiz",
  "question": "Which keyword creates a constant?",
  "options": [
    {
      "id": "a",
      "text": "var",
      "correct": false
    },
    {
      "id": "b",
      "text": "const",
      "correct": true
    }
  ]
}
```

Runtime responsibilities:

- Keyboard navigation
- Scoring
- Validation
- Telemetry

---

## Reflection Node

Purpose:

Capture learner thoughts.

Example:

```json
{
  "type": "reflection",
  "prompt": "Describe what you learned."
}
```

---

## Exercise Node

Purpose:

Allow learner practice.

Examples:

- Coding exercise
- Math problem
- Simulation

May use custom widgets.

---

# 7. Workflow Engine

The workflow engine controls progression between nodes.

Navigation is defined declaratively.

## workflow.json

```json
{
  "routing": {
    "nodes/lesson-01.md": {
      "onComplete": "nodes/quiz-01.json"
    },

    "nodes/quiz-01.json": {
      "conditions": [
        {
          "if": "score >= 80",
          "then": "COMPLETED"
        },
        {
          "if": "score < 80",
          "then": "nodes/lesson-01.md"
        }
      ]
    }
  }
}
```

---

# 8. Skill Graph

The framework supports skill-based learning.

Nodes may map to one or more skills.

Example:

```json
{
  "skills": ["javascript.variables", "javascript.constants"]
}
```

Future routing decisions should prioritize mastery scores over raw assessment scores.

---

# 9. Accessibility Engine

Accessibility is mandatory.

The runtime must enforce:

## Keyboard Navigation

Every interaction must be accessible using:

- Tab
- Shift + Tab
- Enter
- Space
- Arrow Keys

---

## Screen Readers

Generated interfaces must expose:

- Semantic headings
- Labels
- Landmarks
- Form descriptions

---

## Focus Management

The runtime manages focus movement automatically.

Widgets must integrate with the framework focus system.

---

# 10. Widget System

Widgets provide specialized educational interactions.

Examples:

- Coding editors
- Fraction visualizers
- Scientific simulations
- Music notation tools

---

## Widget Declaration

```json
{
  "type": "custom",
  "widget": "@open-edu/fraction-slider",
  "version": "1.0.0",
  "config": {
    "denominator": 4,
    "target": 3
  }
}
```

---

## Widget Contract

```typescript
interface OpenEduWidget {
  mount(element: HTMLElement, config: unknown, context: WidgetContext): void;

  unmount(): void;

  getAriaTree(): AccessibleNodeTree;
}
```

---

## Widget Context

```typescript
interface WidgetContext {
  emitTelemetry(event: string, data: Record<string, unknown>): void;

  onVerify(score: number, metadata?: Record<string, unknown>): void;
}
```

---

# 11. Telemetry Engine

All learner interactions generate telemetry events.

Telemetry is append-only.

Storage format:

```text
.edu/telemetry.jsonl
```

---

## Event Example

```json
{
  "timestamp": 1782142445000,
  "event": "node_open",
  "nodeId": "lesson-01"
}
```

---

## Interaction Example

```json
{
  "timestamp": 1782142458000,
  "event": "widget_interaction",
  "widgetId": "fraction-slider"
}
```

---

## Routing Example

```json
{
  "timestamp": 1782142462000,
  "event": "route_triggered",
  "from": "quiz-01",
  "to": "COMPLETED"
}
```

---

# 12. Reward Broker

The reward broker consumes learning events.

Rewards are external to content.

---

## rewards.json

```json
{
  "triggers": [
    {
      "onEvent": "workflow.complete",
      "rewards": [
        {
          "action": "badge.award",
          "badge": "course-complete"
        }
      ]
    }
  ]
}
```

---

## Supported Reward Types

### Badge

```json
{
  "action": "badge.award"
}
```

### Webhook

```json
{
  "action": "webhook",
  "url": "https://example.com/reward"
}
```

### Script (Optional)

Disabled by default.

Requires:

```bash
--allow-shell-hooks
```

Example:

```json
{
  "action": "script",
  "exec": "./rewards/completed.sh"
}
```

---

# 13. Local Development Runtime

CLI:

```bash
edu dev ./my-package
```

Responsibilities:

- Package loading
- Schema validation
- Local web server
- Hot reload
- Telemetry generation
- Accessibility inspection

---

# 14. MVP Scope

The MVP must include:

## Runtime

- Package loader
- Workflow engine
- Markdown rendering
- Quiz rendering

## Accessibility

- Keyboard navigation
- Screen reader compatibility
- Focus management

## Telemetry

- JSONL event stream
- Event logging

## Rewards

- Badge actions
- Webhook actions

## Development Tools

- Local CLI
- Hot reload
- Validation

---

# 15. Acceptance Criteria

## Agent Generation Test

An external coding agent can generate a valid package from documentation alone.

---

## Package Validation Test

The runtime validates package structure and schemas before execution.

---

## Keyboard Navigation Test

A learner can complete a package using only keyboard input.

---

## Accessibility Test

All rendered interfaces pass automated accessibility validation.

---

## Telemetry Test

Every node interaction generates telemetry events.

---

## Reward Test

Completion events trigger configured rewards.

---

# 16. Future Roadmap

Phase 1

- Core runtime
- Lessons
- Quizzes
- Telemetry

Phase 2

- Accessibility inspector
- Reflection nodes
- Exercise nodes

Phase 3

- Skill graph
- Adaptive learning

Phase 4

- Widget SDK
- Community widgets

Phase 5

- Analytics dashboards
- Curriculum observability

Phase 6

- Package registry
- Cloud deployment
- Collaborative authoring

---

# Mission

Build an open, accessible, AI-native framework for creating portable educational experiences.

# Vision

Educational experiences should be as portable, observable, extensible, and accessible as modern software.
