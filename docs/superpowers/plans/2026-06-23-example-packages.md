# Example Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Epic 11 — four example packages (hello-world tests, intro-javascript, fractions, autism-reading) plus validation tests.

**Architecture:** Each package is a standalone directory under `examples/` loadable by `@open-edu/core`'s `loadPackage()`. Tests live alongside each package. No new packages or dependencies needed.

**Tech Stack:** TypeScript 5.x, Vitest 1.x, `@open-edu/core`, `@open-edu/schemas`

---

### Task 1: hello-world validation test

**Files:**

- Create: `examples/hello-world/validate.test.ts`

- [ ] **Step 1: Create `examples/hello-world/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('hello-world example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname, '..'));
    expect(pkg.manifest.id).toBe('hello-world');
    expect(pkg.manifest.title).toBe('Hello World');
    expect(pkg.manifest.entry).toBe('nodes/hello.md');
    expect(pkg.nodes).toHaveLength(1);
    expect(pkg.nodes[0].relativePath).toBe('nodes/hello.md');
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/hello.md');
  });
});
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec vitest run examples/hello-world/validate.test.ts --reporter verbose`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add examples/hello-world/validate.test.ts
git commit -m "test(hello-world): add validation test for example package"
```

---

### Task 2: Create intro-javascript example package

**Files:**

- Create: `examples/intro-javascript/package.json`
- Create: `examples/intro-javascript/workflow.json`
- Create: `examples/intro-javascript/nodes/what-is-javascript.md`
- Create: `examples/intro-javascript/nodes/variables.md`
- Create: `examples/intro-javascript/nodes/variables-quiz.json`
- Create: `examples/intro-javascript/nodes/finished.md`
- Create: `examples/intro-javascript/validate.test.ts`

- [ ] **Step 1: Write `examples/intro-javascript/package.json`**

```json
{
  "name": "@open-edu/example-intro-javascript",
  "id": "intro-javascript",
  "title": "Introduction to JavaScript",
  "version": "0.1.0",
  "private": true,
  "description": "Multi-node lesson on JavaScript basics for Open-Edu",
  "author": "Open-Edu Team",
  "entry": "nodes/what-is-javascript.md",
  "scripts": {
    "build": "echo 'example build placeholder'",
    "test": "echo 'no tests yet'",
    "lint": "echo 'no lint yet'",
    "typecheck": "echo 'no typecheck yet'",
    "clean": "rm -rf dist"
  }
}
```

- [ ] **Step 2: Write `examples/intro-javascript/workflow.json`**

```json
{
  "routing": {
    "nodes/what-is-javascript.md": {
      "onComplete": "nodes/variables.md"
    },
    "nodes/variables.md": {
      "onComplete": "nodes/variables-quiz.json"
    },
    "nodes/variables-quiz.json": {
      "onComplete": "nodes/finished.md"
    },
    "nodes/finished.md": {
      "onComplete": "COMPLETED"
    }
  }
}
```

- [ ] **Step 3: Write `examples/intro-javascript/nodes/what-is-javascript.md`**

```markdown
# What Is JavaScript?

JavaScript is a programming language that runs in web browsers and on servers.

## Where Does JavaScript Run?

- **Web browsers** — every modern browser has a JavaScript engine
- **Node.js** — JavaScript on servers and command-line tools
- **Mobile apps** — frameworks like React Native use JavaScript

## Why Learn JavaScript?

JavaScript is one of the most widely-used programming languages. It powers the interactive parts of almost every website you visit.

> Press **Next** to learn about variables.
```

- [ ] **Step 4: Write `examples/intro-javascript/nodes/variables.md`**

````markdown
# Variables

Variables store data in JavaScript. Think of them as labeled containers.

## Declaring Variables

Use `let` for values that can change, and `const` for values that stay the same.

```javascript
let score = 0;
const pi = 3.14159;
```
````

## Data Types

JavaScript has several basic data types:

- **Number** — integers and decimals: `42`, `3.14`
- **String** — text: `"hello"`
- **Boolean** — true or false: `true`, `false`
- **Array** — lists: `[1, 2, 3]`
- **Object** — key-value pairs: `{ name: "Alice" }`

> Ready to test your knowledge? Press **Next** for a quiz.

````

- [ ] **Step 5: Write `examples/intro-javascript/nodes/variables-quiz.json`**

```json
{
  "type": "quiz",
  "question": "Which of these correctly declares a JavaScript variable?",
  "options": [
    { "id": "a", "text": "let score = 0;", "correct": true },
    { "id": "b", "text": "variable score = 0;", "correct": false },
    { "id": "c", "text": "const pi = 3.14;", "correct": true },
    { "id": "d", "text": "string name = \"Alice\";", "correct": false }
  ],
  "skills": ["javascript", "basics"]
}
````

- [ ] **Step 6: Write `examples/intro-javascript/nodes/finished.md`**

```markdown
# Congratulations!

You've completed the Introduction to JavaScript lesson.

## What You Learned

- What JavaScript is and where it runs
- How to declare variables with `let` and `const`
- Basic data types like Number, String, Boolean

## Next Steps

Try editing this example and adding more nodes to explore the Open-Edu framework.

> You can now close this lesson.
```

- [ ] **Step 7: Write `examples/intro-javascript/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('intro-javascript example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname, '..'));
    expect(pkg.manifest.id).toBe('intro-javascript');
    expect(pkg.manifest.title).toBe('Introduction to JavaScript');
    expect(pkg.manifest.entry).toBe('nodes/what-is-javascript.md');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/what-is-javascript.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/variables.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/variables-quiz.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/finished.md');
  });
});
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec vitest run examples/intro-javascript/validate.test.ts --reporter verbose`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add examples/intro-javascript/
git commit -m "feat(examples): create intro-javascript example package"
```

---

### Task 3: Create fractions example package

**Files:**

- Create: `examples/fractions/package.json`
- Create: `examples/fractions/workflow.json`
- Create: `examples/fractions/nodes/intro.md`
- Create: `examples/fractions/nodes/quiz.json`
- Create: `examples/fractions/nodes/remediation.md`
- Create: `examples/fractions/nodes/advanced.md`
- Create: `examples/fractions/validate.test.ts`

- [ ] **Step 1: Write `examples/fractions/package.json`**

```json
{
  "name": "@open-edu/example-fractions",
  "id": "fractions",
  "title": "Understanding Fractions",
  "version": "0.1.0",
  "private": true,
  "description": "Quiz with conditional branching and remediation for Open-Edu",
  "author": "Open-Edu Team",
  "entry": "nodes/intro.md",
  "scripts": {
    "build": "echo 'example build placeholder'",
    "test": "echo 'no tests yet'",
    "lint": "echo 'no lint yet'",
    "typecheck": "echo 'no typecheck yet'",
    "clean": "rm -rf dist"
  }
}
```

- [ ] **Step 2: Write `examples/fractions/workflow.json`**

```json
{
  "routing": {
    "nodes/intro.md": {
      "onComplete": "nodes/quiz.json"
    },
    "nodes/quiz.json": {
      "conditions": [
        { "if": "score >= 80", "then": "nodes/advanced.md" },
        { "if": "score < 80", "then": "nodes/remediation.md" }
      ]
    },
    "nodes/advanced.md": {
      "onComplete": "COMPLETED"
    },
    "nodes/remediation.md": {
      "onComplete": "COMPLETED"
    }
  }
}
```

- [ ] **Step 3: Write `examples/fractions/nodes/intro.md`**

```markdown
# Understanding Fractions

A fraction represents a part of a whole.

## Anatomy of a Fraction

A fraction has two parts:
```

3 ← numerator (how many parts)
─
4 ← denominator (how many total parts)

```

- The **numerator** (top) counts how many parts you have
- The **denominator** (bottom) tells how many equal parts make a whole

## Examples

- `1/2` means 1 part out of 2 — half of the whole
- `3/4` means 3 parts out of 4 — three quarters

> Ready for a quiz? Press **Next** to test your knowledge.
```

- [ ] **Step 4: Write `examples/fractions/nodes/quiz.json`**

```json
{
  "type": "quiz",
  "question": "Which statements about fractions are correct?",
  "options": [
    { "id": "a", "text": "The top number is called the numerator", "correct": true },
    { "id": "b", "text": "The bottom number is called the numerator", "correct": false },
    { "id": "c", "text": "1/2 is equivalent to 0.5", "correct": true },
    { "id": "d", "text": "The denominator can be zero", "correct": false }
  ],
  "skills": ["math", "fractions"]
}
```

- [ ] **Step 5: Write `examples/fractions/nodes/remediation.md`**

```markdown
# Let's Review Fractions

It looks like you need a bit more practice. Let's review the basics again.

## Key Points to Remember

- The **numerator** is the top number — it counts how many parts you have
- The **denominator** is the bottom number — it tells how many equal parts make a whole
- The denominator can never be zero

## Try Again

Review the lesson material and try the quiz again when you feel ready.

> Press **Next** to finish this review.
```

- [ ] **Step 6: Write `examples/fractions/nodes/advanced.md`**

```markdown
# Advanced Fractions

Great work! You have a solid understanding of fractions.

## Equivalent Fractions

Fractions that represent the same value are called equivalent fractions:

- `1/2 = 2/4 = 4/8`

To find an equivalent fraction, multiply or divide both the numerator and denominator by the same number.

## Simplifying Fractions

To simplify a fraction, divide both parts by their greatest common factor:

- `4/8` simplified is `1/2` (divide both by 4)

> Press **Next** to complete this lesson.
```

- [ ] **Step 7: Write `examples/fractions/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('fractions example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname, '..'));
    expect(pkg.manifest.id).toBe('fractions');
    expect(pkg.manifest.title).toBe('Understanding Fractions');
    expect(pkg.manifest.entry).toBe('nodes/intro.md');
    expect(pkg.nodes).toHaveLength(4);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/intro.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/quiz.json');
    const quizRoute = pkg.workflow!.routing['nodes/quiz.json'];
    expect(quizRoute).toHaveProperty('conditions');
    expect(Array.isArray(quizRoute.conditions)).toBe(true);
  });
});
```

- [ ] **Step 8: Run tests**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec vitest run examples/fractions/validate.test.ts --reporter verbose`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add examples/fractions/
git commit -m "feat(examples): create fractions example package with conditional routing"
```

---

### Task 4: Create autism-reading example package

**Files:**

- Create: `examples/autism-reading/package.json`
- Create: `examples/autism-reading/workflow.json`
- Create: `examples/autism-reading/nodes/a-day-at-the-park.md`
- Create: `examples/autism-reading/nodes/quiz.json`
- Create: `examples/autism-reading/nodes/reflection.json`
- Create: `examples/autism-reading/validate.test.ts`

- [ ] **Step 1: Write `examples/autism-reading/package.json`**

```json
{
  "name": "@open-edu/example-autism-reading",
  "id": "autism-reading",
  "title": "A Day at the Park",
  "version": "0.1.0",
  "private": true,
  "description": "Accessibility-first reading lesson with reflection for Open-Edu",
  "author": "Open-Edu Team",
  "entry": "nodes/a-day-at-the-park.md",
  "scripts": {
    "build": "echo 'example build placeholder'",
    "test": "echo 'no tests yet'",
    "lint": "echo 'no lint yet'",
    "typecheck": "echo 'no typecheck yet'",
    "clean": "rm -rf dist"
  }
}
```

- [ ] **Step 2: Write `examples/autism-reading/workflow.json`**

```json
{
  "routing": {
    "nodes/a-day-at-the-park.md": {
      "onComplete": "nodes/quiz.json"
    },
    "nodes/quiz.json": {
      "onComplete": "nodes/reflection.json"
    },
    "nodes/reflection.json": {
      "onComplete": "COMPLETED"
    }
  }
}
```

- [ ] **Step 3: Write `nodes/a-day-at-the-park.md`**

```markdown
# A Day at the Park

Sam and Max went to the park.

## At the Pond

They saw ducks in the pond.

The ducks were yellow and white.

Sam fed the ducks some bread.

## On the Playground

Max went down the slide.

Sam played on the swings.

They had fun together.

## Going Home

It was time to go home.

Sam and Max were tired and happy.
```

- [ ] **Step 4: Write `examples/autism-reading/nodes/quiz.json`**

```json
{
  "type": "quiz",
  "question": "What did Sam and Max do at the park?",
  "options": [
    { "id": "a", "text": "They fed the ducks", "correct": true },
    { "id": "b", "text": "They went swimming", "correct": false },
    { "id": "c", "text": "They played video games", "correct": false }
  ],
  "skills": ["reading", "comprehension"]
}
```

- [ ] **Step 5: Write `examples/autism-reading/nodes/reflection.json`**

```json
{
  "type": "reflection",
  "prompt": "How did Sam and Max feel at the end of the day? Write about a time when you felt happy after playing outside."
}
```

- [ ] **Step 6: Write `examples/autism-reading/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { loadPackage } from '@open-edu/core';
import { resolve } from 'path';

describe('autism-reading example', () => {
  it('should load without errors', async () => {
    const pkg = await loadPackage(resolve(__dirname, '..'));
    expect(pkg.manifest.id).toBe('autism-reading');
    expect(pkg.manifest.title).toBe('A Day at the Park');
    expect(pkg.manifest.entry).toBe('nodes/a-day-at-the-park.md');
    expect(pkg.nodes).toHaveLength(3);
    expect(pkg.workflow).not.toBeNull();
    expect(pkg.workflow!.routing).toHaveProperty('nodes/a-day-at-the-park.md');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/quiz.json');
    expect(pkg.workflow!.routing).toHaveProperty('nodes/reflection.json');
  });
});
```

- [ ] **Step 7: Run tests**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm exec vitest run examples/autism-reading/validate.test.ts --reporter verbose`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add examples/autism-reading/
git commit -m "feat(examples): create autism-reading example package with reflection"
```

---

### Task 5: Run full test suite and final checks

- [ ] **Step 1: Run all tests**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm test`
Expected: All tests pass (including the 4 new validation tests)

- [ ] **Step 2: Run typecheck**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm typecheck`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm lint`
Expected: 0 errors

- [ ] **Step 4: Run format check**

Run: `cd /Users/sarthakpatnaik/Code/open-edu && pnpm format:check`
Expected: Clean

- [ ] **Step 5: Create the PR**

```bash
git add -A
git commit -m "feat(examples): implement Epic 11 - Example Packages

Create four example packages demonstrating Open-Edu framework:
- hello-world: validation test for existing minimal package
- intro-javascript: multi-node lesson with quiz
- fractions: quiz with conditional remediation branching
- autism-reading: accessibility-first lesson with reflection

Each package includes a validation test asserting it loads
correctly via @open-edu/core's loadPackage()."
```
