import { describe, it, expect } from 'vitest';
import {
  LessonNodeSchema,
  QuizNodeSchema,
  ReflectionNodeSchema,
  ExerciseNodeSchema,
  WidgetNodeSchema,
  ContentNodeSchema,
  NodeTypeSchema,
} from './nodes';

describe('LessonNodeSchema', () => {
  it('should accept a minimal lesson node', () => {
    expect(LessonNodeSchema.parse({ type: 'lesson' })).toEqual({ type: 'lesson' });
  });

  it('should accept a lesson node with skills', () => {
    expect(LessonNodeSchema.parse({ type: 'lesson', skills: ['math.basics'] })).toEqual({
      type: 'lesson',
      skills: ['math.basics'],
    });
  });

  it('should accept a lesson node with title', () => {
    expect(LessonNodeSchema.parse({ type: 'lesson', title: 'Introduction' })).toEqual({
      type: 'lesson',
      title: 'Introduction',
    });
  });
});

describe('QuizNodeSchema', () => {
  const validQuiz = {
    type: 'quiz' as const,
    question: 'Which keyword creates a constant?',
    options: [
      { id: 'a', text: 'var', correct: false },
      { id: 'b', text: 'const', correct: true },
      { id: 'c', text: 'let', correct: false },
    ],
  };

  it('should accept a valid quiz node', () => {
    expect(QuizNodeSchema.parse(validQuiz)).toEqual(validQuiz);
  });

  it('should reject quiz without options', () => {
    const { options: _options, ...rest } = validQuiz;
    expect(() => QuizNodeSchema.parse(rest)).toThrow();
  });

  it('should reject quiz with single option', () => {
    expect(() =>
      QuizNodeSchema.parse({
        ...validQuiz,
        options: [{ id: 'a', text: 'only', correct: true }],
      }),
    ).toThrow();
  });

  it('should reject quiz with more than 26 options', () => {
    const _options = Array.from({ length: 27 }, (_, i) => ({
      id: String.fromCharCode(97 + i),
      text: `option ${i}`,
      correct: false,
    }));
    expect(() => QuizNodeSchema.parse({ ...validQuiz, options: _options })).toThrow();
  });

  it('should reject quiz with missing correct field', () => {
    const option = validQuiz.options[0]!;
    const { correct: _unused, ...optionWithoutCorrect } = option;
    expect(() =>
      QuizNodeSchema.parse({
        ...validQuiz,
        options: [optionWithoutCorrect, validQuiz.options[1]!, validQuiz.options[2]!],
      }),
    ).toThrow();
  });

  it('should accept quiz with skills', () => {
    expect(QuizNodeSchema.parse({ ...validQuiz, skills: ['javascript.variables'] })).toMatchObject({
      skills: ['javascript.variables'],
    });
  });

  it('should accept a quiz node with title', () => {
    expect(
      QuizNodeSchema.parse({ ...validQuiz, title: 'Variables Knowledge Check' }),
    ).toMatchObject({ title: 'Variables Knowledge Check' });
  });
});

describe('ReflectionNodeSchema', () => {
  it('should accept a valid reflection node', () => {
    expect(
      ReflectionNodeSchema.parse({ type: 'reflection', prompt: 'Describe what you learned.' }),
    ).toEqual({ type: 'reflection', prompt: 'Describe what you learned.' });
  });

  it('should reject reflection without prompt', () => {
    expect(() => ReflectionNodeSchema.parse({ type: 'reflection' })).toThrow();
  });

  it('should accept reflection with skills', () => {
    expect(
      ReflectionNodeSchema.parse({
        type: 'reflection',
        prompt: 'What did you learn?',
        skills: ['reflection.meta'],
      }),
    ).toMatchObject({ skills: ['reflection.meta'] });
  });

  it('should accept a reflection node with title', () => {
    expect(
      ReflectionNodeSchema.parse({
        type: 'reflection',
        prompt: 'What did you learn?',
        title: 'Learning Reflection',
      }),
    ).toMatchObject({ title: 'Learning Reflection' });
  });
});

describe('ExerciseNodeSchema', () => {
  it('should accept a minimal exercise node', () => {
    expect(ExerciseNodeSchema.parse({ type: 'exercise' })).toEqual({ type: 'exercise' });
  });

  it('should accept exercise with widget reference', () => {
    expect(
      ExerciseNodeSchema.parse({
        type: 'exercise',
        widget: '@open-edu/fraction-slider',
        config: { denominator: 4 },
      }),
    ).toMatchObject({ widget: '@open-edu/fraction-slider', config: { denominator: 4 } });
  });

  it('should accept an exercise node with title', () => {
    expect(
      ExerciseNodeSchema.parse({ type: 'exercise', title: 'Grid Area Practice' }),
    ).toMatchObject({ title: 'Grid Area Practice' });
  });
});

describe('WidgetNodeSchema', () => {
  it('should accept a valid custom widget node', () => {
    expect(
      WidgetNodeSchema.parse({
        type: 'custom',
        widget: '@open-edu/fraction-slider',
        version: '1.0.0',
        config: { denominator: 4, target: 3 },
      }),
    ).toMatchObject({ widget: '@open-edu/fraction-slider' });
  });

  it('should accept widget node without version and config', () => {
    expect(
      WidgetNodeSchema.parse({ type: 'custom', widget: '@open-edu/code-editor' }),
    ).toMatchObject({ widget: '@open-edu/code-editor' });
  });

  it('should reject widget node without widget field', () => {
    expect(() => WidgetNodeSchema.parse({ type: 'custom' })).toThrow();
  });

  it('should accept a widget node with title', () => {
    expect(
      WidgetNodeSchema.parse({ type: 'custom', widget: 'test', title: 'Custom Widget' }),
    ).toMatchObject({ title: 'Custom Widget' });
  });
});

describe('ContentNodeSchema (discriminated union)', () => {
  it('should parse a lesson node', () => {
    expect(ContentNodeSchema.parse({ type: 'lesson' })).toEqual({ type: 'lesson' });
  });

  it('should parse a quiz node', () => {
    const quiz = {
      type: 'quiz',
      question: 'What is 2+2?',
      options: [
        { id: 'a', text: '3', correct: false },
        { id: 'b', text: '4', correct: true },
      ],
    };
    expect(ContentNodeSchema.parse(quiz)).toEqual(quiz);
  });

  it('should parse a reflection node', () => {
    expect(ContentNodeSchema.parse({ type: 'reflection', prompt: 'Reflect' })).toEqual({
      type: 'reflection',
      prompt: 'Reflect',
    });
  });

  it('should parse an exercise node', () => {
    expect(ContentNodeSchema.parse({ type: 'exercise' })).toEqual({ type: 'exercise' });
  });

  it('should parse a custom widget node', () => {
    expect(ContentNodeSchema.parse({ type: 'custom', widget: 'test' })).toEqual({
      type: 'custom',
      widget: 'test',
    });
  });

  it('allows a custom node with both remoteWidget and widgetRef (additive)', () => {
    const result = ContentNodeSchema.parse({
      type: 'custom',
      widget: 'some-widget',
      remoteWidget: {
        id: 'legacy-remote',
        version: '1.0.0',
        url: 'https://cdn.example.com/w.js',
        apiVersion: '1.0.0',
      },
      widgetRef: {
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
        integrity: 'sha256-' + 'a'.repeat(64),
      },
    });
    if (result.type !== 'custom') {
      throw new Error('expected custom node');
    }
    expect(result.widgetRef).toBeDefined();
    expect(result.remoteWidget).toBeDefined();
  });

  it('should reject unknown node type', () => {
    expect(() => ContentNodeSchema.parse({ type: 'unknown' })).toThrow();
  });

  it('should reject node with wrong type discriminator', () => {
    expect(() => ContentNodeSchema.parse({ type: 'video' })).toThrow();
  });

  it('should reject quiz node missing required question field', () => {
    expect(() =>
      ContentNodeSchema.parse({ type: 'quiz', options: [{ id: 'a', text: 'yes', correct: true }] }),
    ).toThrow();
  });

  it('should strip unknown fields from lesson nodes', () => {
    const result = ContentNodeSchema.parse({ type: 'lesson', unknownField: 'test' });
    expect(result).not.toHaveProperty('unknownField');
  });

  it('should preserve title field when present on lesson node', () => {
    const result = ContentNodeSchema.parse({ type: 'lesson', title: 'Hello' });
    expect(result).toMatchObject({ title: 'Hello' });
  });
});

describe('title field validation', () => {
  const validQuiz = {
    type: 'quiz' as const,
    question: 'Test?',
    options: [
      { id: 'a', text: 'yes', correct: true },
      { id: 'b', text: 'no', correct: false },
    ],
  };

  it('should reject title exceeding 256 characters', () => {
    expect(() => LessonNodeSchema.parse({ type: 'lesson', title: 'a'.repeat(257) })).toThrow();

    expect(() => QuizNodeSchema.parse({ ...validQuiz, title: 'a'.repeat(257) })).toThrow();
  });

  it('should accept title at exactly 256 characters', () => {
    expect(LessonNodeSchema.parse({ type: 'lesson', title: 'a'.repeat(256) })).toMatchObject({
      title: 'a'.repeat(256),
    });
  });

  it('should accept nodes without a title (optional)', () => {
    expect(LessonNodeSchema.parse({ type: 'lesson' })).not.toHaveProperty('title');
    expect(QuizNodeSchema.parse(validQuiz)).not.toHaveProperty('title');
    expect(
      ReflectionNodeSchema.parse({ type: 'reflection', prompt: 'Reflect' }),
    ).not.toHaveProperty('title');
    expect(ExerciseNodeSchema.parse({ type: 'exercise' })).not.toHaveProperty('title');
    expect(WidgetNodeSchema.parse({ type: 'custom', widget: 'test' })).not.toHaveProperty('title');
  });
});

describe('NodeTypeSchema', () => {
  it('should accept all valid node types', () => {
    expect(NodeTypeSchema.parse('lesson')).toBe('lesson');
    expect(NodeTypeSchema.parse('quiz')).toBe('quiz');
    expect(NodeTypeSchema.parse('reflection')).toBe('reflection');
    expect(NodeTypeSchema.parse('exercise')).toBe('exercise');
    expect(NodeTypeSchema.parse('custom')).toBe('custom');
  });

  it('should reject invalid node types', () => {
    expect(() => NodeTypeSchema.parse('video')).toThrow();
  });
});
