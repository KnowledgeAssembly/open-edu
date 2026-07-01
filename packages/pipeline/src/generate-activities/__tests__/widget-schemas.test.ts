import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { registerWidgetSchema, getWidgetSchema, registerAllWidgetSchemas } from '../widget-schemas.js';
import type { LlmProvider } from '@open-edu/llm-config';
import type { GeneratedConcept } from '../../types.js';
import { generateActivitiesForConcept } from '../index.js';

describe('widget schema registry', () => {
  beforeEach(() => {
    // Reset registry by re-registering all schemas
    registerAllWidgetSchemas();
  });

  it('stores and retrieves schemas', () => {
    const schema = z.object({ x: z.number() });
    registerWidgetSchema('test.widget', schema);
    const retrieved = getWidgetSchema('test.widget');
    expect(retrieved).toBe(schema);
  });

  it('returns undefined for unknown widget ID', () => {
    expect(getWidgetSchema('nonexistent.widget')).toBeUndefined();
  });

  it('registers all built-in widget schemas', () => {
    const expectedIds = [
      'open-edu.matching',
      'open-edu.drag-drop',
      'open-edu.sequencing',
      'open-edu.story-question',
      'open-edu.fill-blank',
      'open-edu.visual-counting',
      'open-edu.fraction-visual',
      'open-edu.chart-reader',
      'open-edu.clock-time',
      'open-edu.measurement-scale',
      'open-edu.place-value-chart',
      'open-edu.grid-area',
      'open-edu.real-world',
      'open-edu.multiple-choice',
    ];
    for (const id of expectedIds) {
      expect(getWidgetSchema(id)).toBeDefined();
    }
  });
});

describe('widget schema validation', () => {
  it('matchingSchema accepts valid config', () => {
    const schema = getWidgetSchema('open-edu.matching')!;
    const result = schema.safeParse({
      pairs: [{ itemA: 'Term A', itemB: 'Definition B' }],
    });
    expect(result.success).toBe(true);
  });

  it('matchingSchema rejects config missing required pairs', () => {
    const schema = getWidgetSchema('open-edu.matching')!;
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('matchingSchema rejects config with empty pairs', () => {
    const schema = getWidgetSchema('open-edu.matching')!;
    const result = schema.safeParse({ pairs: [] });
    expect(result.success).toBe(false);
  });

  it('fractionVisualSchema accepts valid config', () => {
    const schema = getWidgetSchema('open-edu.fraction-visual')!;
    const result = schema.safeParse({ numerator: 1, denominator: 4 });
    expect(result.success).toBe(true);
  });

  it('fractionVisualSchema rejects zero denominator', () => {
    const schema = getWidgetSchema('open-edu.fraction-visual')!;
    const result = schema.safeParse({ numerator: 1, denominator: 0 });
    expect(result.success).toBe(false);
  });

  it('dragDropSchema accepts valid config', () => {
    const schema = getWidgetSchema('open-edu.drag-drop')!;
    const result = schema.safeParse({
      items: [{ id: 'i1', label: 'Item' }],
      targets: [{ id: 't1', label: 'Target' }],
      expectedPositions: { i1: 't1' },
    });
    expect(result.success).toBe(true);
  });

  it('clockTimeSchema accepts valid config', () => {
    const schema = getWidgetSchema('open-edu.clock-time')!;
    const result = schema.safeParse({ hour: 10, minute: 30 });
    expect(result.success).toBe(true);
  });

  it('clockTimeSchema rejects invalid hour', () => {
    const schema = getWidgetSchema('open-edu.clock-time')!;
    const result = schema.safeParse({ hour: 25, minute: 30 });
    expect(result.success).toBe(false);
  });
});

describe('generateStep widget validation', () => {
  function makeMockLlm(responses: unknown[]): LlmProvider {
    let callIndex = 0;
    return {
      generateStructured<T>(_prompt: string, _schema: z.ZodType<T>): Promise<T> {
        const response = responses[callIndex];
        callIndex++;
        if (response instanceof Error) throw response;
        return Promise.resolve(response as T);
      },
    };
  }

  function makeConcept(): GeneratedConcept {
    return {
      conceptId: 'test_concept',
      chapterCode: 'CH1',
      chapterName: 'Test Chapter',
      learningObjective: 'Test objective with sufficient length for validation',
      coreIdea: 'A core idea for testing purposes.',
      examples: ['Example one', 'Example two'],
      misconceptions: ['Misconception one'],
      supports: { visual: true },
      masteryCriteria: 0.8,
      difficulty: 'beginner',
      estimatedDuration: 15,
      dependencies: [],
    };
  }

  it('produces widget activity when LLM returns valid widget output', async () => {
    const llm = makeMockLlm([
      {
        type: 'widget',
        content: {
          description: 'Family Matching',
          instructions: 'Match each family type.',
        },
        widgetId: 'open-edu.matching',
        widgetConfig: {
          pairs: [{ itemA: 'Joint', itemB: 'Multiple generations' }],
        },
      },
      // Remaining steps use defaults
      {
        type: 'exercise',
        content: { description: 'Practice', instructions: 'Practice problems.' },
      },
      {
        type: 'exercise',
        content: { description: 'Practice', instructions: 'Solve these.' },
      },
      {
        type: 'quiz',
        content: {
          description: 'Quiz',
          questions: [{ question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }],
        },
      },
      {
        type: 'reflection',
        content: { description: 'Done', instructions: 'Reflect.' },
      },
    ]);

    const result = await generateActivitiesForConcept(llm, makeConcept());
    expect(result.errors).toHaveLength(0);
    expect(result.activities).toHaveLength(5);
    const widgetActivity = result.activities.find((a) => a.courseSpecType === 'widget');
    expect(widgetActivity).toBeDefined();
    expect(widgetActivity!.widgetId).toBe('open-edu.matching');
    expect(widgetActivity!.widgetConfig).toBeDefined();
  });

  it('falls back to reading when widget config validation fails', async () => {
    // Provide 5 responses plus one extra for the widget retry
    const llm = makeMockLlm([
      // Step 0 (observe) attempt 0: widget with invalid config
      {
        type: 'widget',
        content: {
          description: 'Clock Activity',
          instructions: 'Read the clock.',
        },
        widgetId: 'open-edu.clock-time',
        widgetConfig: { hour: 25, minute: 30 },
      },
      // Step 0 (observe) attempt 1: valid reading fallback
      {
        type: 'reading',
        content: { description: 'Clock Basics', instructions: 'Read about clocks.' },
      },
      // Steps 1-4 use default types
      {
        type: 'exercise',
        content: { description: 'Practice', instructions: 'Practice problems.' },
      },
      {
        type: 'exercise',
        content: { description: 'Practice', instructions: 'Solve these.' },
      },
      {
        type: 'quiz',
        content: {
          description: 'Quiz',
          questions: [{ question: 'Q1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 }],
        },
      },
      {
        type: 'reflection',
        content: { description: 'Done', instructions: 'Reflect.' },
      },
    ]);

    registerAllWidgetSchemas();
    const result = await generateActivitiesForConcept(llm, makeConcept());
    expect(result.errors).toHaveLength(0);
    const widgetActivity = result.activities.find((a) => a.courseSpecType === 'widget');
    expect(widgetActivity).toBeUndefined();
    const readingActivity = result.activities.find((a) => a.courseSpecType === 'reading');
    expect(readingActivity).toBeDefined();
  });
});
