import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  registerWidgetSchema,
  getWidgetSchema,
  registerAllWidgetSchemas,
  getAllowedWidgetIdsForProfile,
  isWidgetAllowedForProfile,
} from '../widget-schemas.js';
import type { LlmProvider } from '@open-edu/llm-config';
import type { GeneratedConcept } from '../../types.js';
import type { CurriculumProfile } from '../../profile/types.js';
import { generateActivitiesForConcept } from '../index.js';

function makeProfile(overrides: Partial<CurriculumProfile> = {}): CurriculumProfile {
  return {
    id: 'test',
    subject: 'test',
    locale: 'en-IN',
    language: 'en',
    sourceTaxonomy: {
      lessonLabels: ['Lesson'],
      sectionLabels: ['Section'],
      objectiveLabels: ['Objectives'],
      definitionLabels: ['Definition'],
      exampleLabels: ['Example'],
      exerciseLabels: ['Exercise'],
      reviewLabels: ['Review'],
      assessmentLabels: ['Assessment'],
    },
    conceptKinds: ['knowledge'],
    representations: ['visual'],
    questionFamilies: ['direct_question'],
    widgetCategories: ['core'],
    assetRendererTypes: [],
    validatorIds: [],
    promptContext: {},
    ...overrides,
  };
}

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
      'core.matching',
      'core.drag-drop',
      'core.sequencing',
      'core.story-question',
      'core.fill-blank',
      'core.visual-counting',
      'math.fraction-visual',
      'core.chart-reader',
      'math.clock-time',
      'math.measurement-scale',
      'math.place-value-chart',
      'math.grid-area',
      'core.real-world',
      'core.multiple-choice',
    ];
    for (const id of expectedIds) {
      expect(getWidgetSchema(id)).toBeDefined();
    }
  });
});

describe('widget schema validation', () => {
  it('matchingSchema accepts valid config', () => {
    const schema = getWidgetSchema('core.matching')!;
    const result = schema.safeParse({
      pairs: [{ itemA: 'Term A', itemB: 'Definition B' }],
    });
    expect(result.success).toBe(true);
  });

  it('matchingSchema rejects config missing required pairs', () => {
    const schema = getWidgetSchema('core.matching')!;
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('matchingSchema rejects config with empty pairs', () => {
    const schema = getWidgetSchema('core.matching')!;
    const result = schema.safeParse({ pairs: [] });
    expect(result.success).toBe(false);
  });

  it('fractionVisualSchema accepts valid config', () => {
    const schema = getWidgetSchema('math.fraction-visual')!;
    const result = schema.safeParse({ numerator: 1, denominator: 4 });
    expect(result.success).toBe(true);
  });

  it('fractionVisualSchema rejects zero denominator', () => {
    const schema = getWidgetSchema('math.fraction-visual')!;
    const result = schema.safeParse({ numerator: 1, denominator: 0 });
    expect(result.success).toBe(false);
  });

  it('dragDropSchema accepts valid config', () => {
    const schema = getWidgetSchema('core.drag-drop')!;
    const result = schema.safeParse({
      items: [{ id: 'i1', label: 'Item' }],
      targets: [{ id: 't1', label: 'Target' }],
      expectedPositions: { i1: 't1' },
    });
    expect(result.success).toBe(true);
  });

  it('clockTimeSchema accepts valid config', () => {
    const schema = getWidgetSchema('math.clock-time')!;
    const result = schema.safeParse({ hour: 10, minute: 30 });
    expect(result.success).toBe(true);
  });

  it('clockTimeSchema rejects invalid hour', () => {
    const schema = getWidgetSchema('math.clock-time')!;
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
        widgetId: 'core.matching',
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
    expect(widgetActivity!.widgetId).toBe('core.matching');
    expect(widgetActivity!.widgetConfig).toBeDefined();
  });

  describe('profile-aware widget filtering', () => {
    it('getAllowedWidgetIdsForProfile with math profile includes math.* widgets', () => {
      const mathProfile = makeProfile({ id: 'math', widgetCategories: ['core', 'math'] });
      const ids = getAllowedWidgetIdsForProfile(mathProfile);
      expect(ids).toContain('math.fraction-visual');
      expect(ids).toContain('math.clock-time');
      expect(ids).toContain('core.matching');
    });

    it('getAllowedWidgetIdsForProfile with generic profile includes only core.*', () => {
      const ids = getAllowedWidgetIdsForProfile(makeProfile());
      expect(ids).toContain('core.matching');
      expect(ids).not.toContain('math.fraction-visual');
    });

    it('getAllowedWidgetIdsForProfile with science profile includes core + science', () => {
      const scienceProfile = makeProfile({ id: 'science', widgetCategories: ['core', 'science'] });
      const ids = getAllowedWidgetIdsForProfile(scienceProfile);
      expect(ids).toContain('core.matching');
    });

    it('getAllowedWidgetIdsForProfile with empty categories returns empty', () => {
      const ids = getAllowedWidgetIdsForProfile(makeProfile({ widgetCategories: [] }));
      expect(ids).toEqual([]);
    });

    it('isWidgetAllowedForProfile rejects math widget for generic profile', () => {
      const profile = makeProfile();
      expect(isWidgetAllowedForProfile('math.fraction-visual', profile)).toBe(false);
    });

    it('isWidgetAllowedForProfile accepts core widget for any profile with core', () => {
      const profile = makeProfile();
      expect(isWidgetAllowedForProfile('core.matching', profile)).toBe(true);
    });
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
        widgetId: 'math.clock-time',
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
