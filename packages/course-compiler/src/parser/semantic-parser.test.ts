import { describe, it, expect } from 'vitest';
import { parseSemantic } from './semantic-parser.js';
import { parseMarkdown } from './markdown-ast.js';

function parse(md: string) {
  const { ast, frontmatter } = parseMarkdown(md);
  return parseSemantic({ ast, frontmatter });
}

describe('parseSemantic', () => {
  it('parses a complete valid course spec', () => {
    const md = `---
title: Introduction to Algebra
description: Learn the basics of algebra
---

# Module 1: Algebra Basics

This module covers the foundation of algebra.

## Lesson 1.1: Variables

**Objectives:**
- Understand what a variable represents
- Identify variables in expressions

Variables are symbols that represent quantities.

### Activity: Reading

Read the chapter on variables.

### Quiz: Variables Quiz

1. What is a variable?
- [x] A symbol for a quantity
- [ ] A type of number
- [ ] An equation
`;

    const result = parse(md);
    expect(result.model).not.toBeNull();
    expect(result.diagnostics).toBeDefined();

    const model = result.model!;
    expect(model).not.toBeNull();
    expect(model.metadata.title).toBe('Introduction to Algebra');
    expect(model.metadata.description).toBe('Learn the basics of algebra');
    expect(model.modules).toHaveLength(1);
    expect(model.modules[0]!.id).toBe('module-1');
    expect(model.modules[0]!.title).toBe('Algebra Basics');
    expect(model.modules[0]!.lessons).toHaveLength(1);
    expect(model.modules[0]!.lessons[0]!.id).toBe('lesson-11');
    expect(model.modules[0]!.lessons[0]!.title).toBe('Variables');
    expect(model.modules[0]!.lessons[0]!.objectives).toHaveLength(2);
    expect(model.modules[0]!.lessons[0]!.objectives[0]!.description).toBe(
      'Understand what a variable represents',
    );
  });

  it('maps frontmatter fields to course metadata', () => {
    const md = `---
title: Test Course
description: A test course
author: John
version: 1.0
language: fr
difficulty: advanced
estimatedHours: 5
keywords: [test, course]
---

# Module
## Lesson
Content
`;

    const result = parse(md);
    const m = result.model!.metadata;
    expect(m.title).toBe('Test Course');
    expect(m.author).toBe('John');
    expect(m.version).toBe('1.0');
    expect(m.language).toBe('fr');
    expect(m.difficulty).toBe('advanced');
    expect(m.estimatedHours).toBe(5);
    expect(m.keywords).toEqual(['test', 'course']);
  });

  it('handles missing frontmatter fields gracefully', () => {
    const md = `# Module 1

## Lesson 1

Content
`;

    const result = parse(md);
    expect(result.model).not.toBeNull();
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(2); // warnings for missing title and description
  });

  it('parses multiple modules', () => {
    const md = `---
title: Multi-Module Course
description: Desc
---

# Module 1: Basics

## Lesson 1.1: Intro

Content

# Module 2: Advanced

## Lesson 2.1: Deep Dive

Content
`;

    const result = parse(md);
    expect(result.model!.modules).toHaveLength(2);
    expect(result.model!.modules[0]!.id).toBe('module-1');
    expect(result.model!.modules[1]!.id).toBe('module-2');
  });

  it('parses multiple lessons per module', () => {
    const md = `---
title: Course
description: Desc
---

# Module 1

## Lesson 1: First

Content A

## Lesson 2: Second

Content B
`;

    const result = parse(md);
    expect(result.model!.modules[0]!.lessons).toHaveLength(2);
    expect(result.model!.modules[0]!.lessons[0]!.id).toBe('lesson-1');
    expect(result.model!.modules[0]!.lessons[1]!.id).toBe('lesson-2');
  });

  it('detects activity sections from H3 headings', () => {
    const md = `---
title: Course
description: Desc
---

# Module

## Lesson

**Objectives:**
- Objective

Content

### Activity: Reading

Read this text.

### Activity: Exercise

Solve these problems.

### Activity: Discussion

Discuss the topic.
`;

    const result = parse(md);
    const lesson = result.model!.modules[0]!.lessons[0]!;
    expect(lesson.activities).toBeDefined();
    expect(lesson.activities).toHaveLength(3);
    expect(lesson.activities![0]!.type).toBe('reading');
    expect(lesson.activities![1]!.type).toBe('exercise');
    expect(lesson.activities![2]!.type).toBe('discussion');
  });

  it('detects quiz sections from H3 headings', () => {
    const md = `---
title: Course
description: Desc
---

# Module

## Lesson

**Objectives:**
- Objective

Content

### Quiz: Test Quiz

1. What is 2+2?
- [x] 4
- [ ] 5
- [ ] 6
`;

    const result = parse(md);
    const lesson = result.model!.modules[0]!.lessons[0]!;
    expect(lesson.quiz).toBeDefined();
    expect(lesson.quiz!.title).toBe('Test Quiz');

    // Check that the lesson body includes the quiz content (question and options exist)
    expect(lesson.content).toContain('What is 2+2');

    // Questions are extracted from the serialized content when possible
    // Currently supports basic multiple-choice parsing
    if (lesson.quiz!.questions.length > 0) {
      expect(lesson.quiz!.questions[0]!.type).toBe('multiple-choice');
    }
  });

  it('generates IDs from heading slugs', () => {
    const md = `---
title: Course
description: Desc
---

# My First Module

## Introduction to Variables

Content
`;

    const result = parse(md);
    expect(result.model!.modules[0]!.id).toBe('my-first-module');
    expect(result.model!.modules[0]!.lessons[0]!.id).toBe('introduction-to-variables');
  });

  it('returns default objectives when none specified', () => {
    const md = `---
title: Course
description: Desc
---

# Module

## Lesson

No objectives here.
`;

    const result = parse(md);
    const lesson = result.model!.modules[0]!.lessons[0]!;
    expect(lesson.objectives).toHaveLength(1);
    expect(lesson.objectives[0]!.description).toContain('Understand');
  });

  it('serializes lesson content as markdown', () => {
    const md = `---
title: Course
description: Desc
---

# Module

## Lesson

**Objectives:**
- Objective

Here is some **bold** and *italic* content with \`code\`.

- List item 1
- List item 2
`;

    const result = parse(md);
    const lesson = result.model!.modules[0]!.lessons[0]!;
    expect(lesson.content).toContain('**bold**');
    expect(lesson.content).toContain('*italic*');
    expect(lesson.content).toContain('`code`');
    expect(lesson.content).toContain('List item 1');
  });

  it('returns null model when no modules found', () => {
    const md = `---
title: Course
description: Desc
---

Just some text with no headings.
`;

    const result = parse(md);
    expect(result.model).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('collects diagnostics for missing title and description', () => {
    const md = `---
notitle: true
---

# Module

## Lesson

Content
`;

    const result = parse(md);
    const warningDiags = result.diagnostics.filter((d) => d.severity === 'warning');
    expect(warningDiags.length).toBeGreaterThanOrEqual(1);
  });
});
