---
sidebar_position: 11
---

# Workflow

The **workflow** package (`@open-edu/workflow`) provides XState-based state machine execution for course progression, skill tracking, mastery-based routing, and multi-module bundle orchestration.

## Quick Start

```ts
import { WorkflowEngine } from '@open-edu/workflow';

const engine = new WorkflowEngine({
  workflow: loadedPackage.workflow,
  onNodeChange: (node) => console.log('Current node:', node),
  onEvent: (event) => console.log('Event:', event),
});

engine.start();
engine.complete('nodes/intro.md'); // advance to next node
```

## Responsibilities

### WorkflowEngine

The core state machine that controls navigation through course nodes:

- **Linear progression** — sequential node-by-node advancement
- **Conditional branching** — score-based or skill-based route selection
- **Remediation loops** — retry failed content with different paths
- **Checkpoint/restore** — serialize and resume learner state

### Skill Tracking

- `createSkillState()` — initializes an empty skill state map
- `applyAssessment(skillState, scores)` — updates skill scores from quiz/assessment results
- Mastery levels: `not_attempted` → `in_progress` → `achieved` → `mastered`
- Emits `SKILL_UPDATED` and `SKILL_ACHIEVED` events when thresholds are crossed

### Topology Ordering

- `getOrderedNodes(workflow)` — topological sort of workflow nodes for deterministic rendering order

### BundleEngine

Orchestrates per-module `WorkflowEngine` instances for multi-module bundles:

- **Module lifecycle** — `locked` → `unlocked` → `in_progress` → `completed`
- **Prerequisite unlocking** — walks reverse dependency graph when a module completes
- **Resume/checkpoint** — serializes `ModuleProgressSnapshot` per module
- **Events** — `module.changed`, `module.completed`, `module.unlocked`, `bundle.completed`

### Condition Evaluation

- `evaluateCondition(condition, context)` — evaluates routing conditions (score thresholds, skill mastery, combinators)

### Event System

- `createWorkflowEvent(type, data)` — typed event factory
- Event types: `NODE_COMPLETE`, `NODE_SKIP`, `SKILL_UPDATED`, `SKILL_ACHIEVED`

## Machine Builder

- `buildMachineConfig(workflow, options)` — converts a workflow definition into an XState machine config
- Handles linear, conditional, and skill-based routing patterns

## State Encoding

- `encodeStateName(nodeId)` — safe state name encoding for XState
- `decodeStateName(encoded)` — reverse encoding

## Dependencies

- `@open-edu/schemas` — workflow type definitions
- `xstate` ^5.0 — state machine library

## Tests

```bash
pnpm --filter @open-edu/workflow test
```
