# Example Packages — Design Spec

## Overview

Epic 11 creates four example educational packages that demonstrate the Open-Edu framework's capabilities. These packages serve as both developer reference and integration test fixtures. Three are new implementations; the fourth (hello-world) was completed in Epic 10 and only needs test coverage.

## Stories

| Story | Description                                                |
| ----- | ---------------------------------------------------------- |
| 11.1  | hello-world + intro-javascript example packages            |
| 11.2  | fractions + autism-reading example packages                |

## Architecture

Each package is a self-contained directory under `examples/` loadable by `@open-edu/core`'s `loadPackage()`. No cross-package dependencies. Each must have:
- `package.json` — valid Open-Edu manifest (`id`, `title`, `version`, `author`, `entry`)
- `nodes/` — content files (`.md` lessons, `.json` quizzes/reflections)
- `workflow.json` — routing between nodes

No assets or rewards needed for MVP.

## Package Specifications

### hello-world (existing, needs validation test)

**Purpose:** Minimal single-node package. One lesson → completion.

**Structure:** Already has manifest, workflow, lesson node. Only needs a test.

### intro-javascript

**Purpose:** Multi-node linear progression with a quiz. Demonstrates multiple lessons followed by knowledge check.

**Nodes:**
| File | Type | Content |
|------|------|---------|
| `nodes/what-is-javascript.md` | lesson | What is JavaScript, where it runs |
| `nodes/variables.md` | lesson | Variables, let/const, data types |
| `nodes/variables-quiz.json` | quiz | 3 multiple-choice questions on variables |
| `nodes/finished.md` | lesson | Congratulations, next steps |

**Workflow:** Linear chain — `what-is-javascript.md` → `variables.md` → `variables-quiz.json` → `COMPLETED`

### fractions

**Purpose:** Quiz with conditional remediation branching. Demonstrates `conditions`-based routing on quiz score.

**Nodes:**
| File | Type | Content |
|------|------|---------|
| `nodes/intro.md` | lesson | What are fractions, numerator/denominator |
| `nodes/quiz.json` | quiz | 4 multiple-choice questions on fractions |
| `nodes/remediation.md` | lesson | Remedial content for low scores |
| `nodes/advanced.md` | lesson | Advanced fractions for high scores |

**Workflow:** Conditional — `intro.md` → `quiz.json` → if score ≥ 80 go to `advanced.md`, else go to `remediation.md`. Both `advanced.md` and `remediation.md` route to `COMPLETED`.

### autism-reading

**Purpose:** Accessibility-first example with reflection node. Demonstrates accessible content design and reflection prompts.

**Nodes:**
| File | Type | Content |
|------|------|---------|
| `nodes/a-day-at-the-park.md` | lesson | Simple, short sentences, large concepts, reading comprehension |
| `nodes/quiz.json` | quiz | 3 simple questions about the story |
| `nodes/reflection.json` | reflection | Prompt asking how the story made the learner feel |

**Workflow:** Linear — `a-day-at-the-park.md` → `quiz.json` → `reflection.json` → `COMPLETED`

## Testing

A single test file `examples/validate-all.test.ts` that calls `loadPackage()` on each of the four examples and asserts:
- No errors thrown
- Correct node count
- Correct entry node path
- Workflow is present with expected routing keys

## Quiz Content Strategy

Questions are simple and pedagogically sound. Each quiz:
- Has exactly one correct answer per question
- Provides meaningful distractors (wrong but plausible)
- Tests concepts introduced in preceding lesson nodes
- Uses `correct: true/false` on options (not weights)
