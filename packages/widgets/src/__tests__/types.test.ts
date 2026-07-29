import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { LearningIntent } from '../metadata/learning-intents';
import type { WidgetDefinition, WidgetDefinitionV2 } from '../types';

describe('WidgetDefinition', () => {
  it('accepts a minimal v1 definition', () => {
    const def: WidgetDefinition = {
      id: 'test.widget',
      render: () => null,
    };
    expect(def.id).toBe('test.widget');
  });

  it('accepts a full v2 definition with all metadata', () => {
    const def: WidgetDefinitionV2 = {
      id: 'core.matching',
      version: '1.0.0',
      name: 'Matching',
      description: 'Match pairs of items',
      domain: 'core',
      learningIntents: [LearningIntent.Practice, LearningIntent.Compare],
      capabilities: {
        supportsKeyboard: true,
        supportsScreenReader: true,
        supportsHints: true,
        supportsRetry: true,
        supportsScoring: true,
        supportsTouch: true,
        supportsMouse: true,
        supportsAnalytics: true,
        supportsRewards: true,
        supportsAccessibility: true,
      },
      accessibility: {
        highContrast: true,
        keyboardOnly: true,
        screenReader: true,
        focusManagement: true,
        ariaSupport: true,
      },
      analytics: {
        trackAttempts: true,
        trackCompletionTime: true,
        trackSuccessRate: true,
      },
      reward: {
        completionXP: 10,
        confetti: true,
      },
      ai: {
        difficulty: 'medium',
        estimatedMinutes: 5,
        bloomsLevel: 'apply',
        cognitiveLoad: 'moderate',
        subjectTags: ['general'],
      },
      schema: z.object({}),
      renderer: null,
      icon: 'puzzle',
      keywords: ['match', 'pairs'],
      status: 'stable',
      render: () => null,
    };
    expect(def.domain).toBe('core');
    expect(def.learningIntents).toContain(LearningIntent.Practice);
    expect(def.capabilities?.supportsKeyboard).toBe(true);
    expect(def.accessibility?.screenReader).toBe(true);
    expect(def.ai?.difficulty).toBe('medium');
  });

  it('v2 definition is assignable to WidgetDefinition', () => {
    const v2: WidgetDefinitionV2 = {
      id: 'core.test',
      name: 'Test',
      description: 'Test widget',
      domain: 'core',
      learningIntents: [],
      capabilities: {},
      accessibility: {},
      analytics: {},
      reward: {},
      ai: {},
      status: 'stable',
      render: () => null,
    };
    const def: WidgetDefinition = v2;
    expect(def.id).toBe('core.test');
  });

  it('supports deprecated widget metadata', () => {
    const def: WidgetDefinitionV2 = {
      id: 'open-edu.old-widget',
      name: 'Old Widget',
      description: 'Deprecated',
      domain: 'core',
      learningIntents: [],
      capabilities: {},
      accessibility: {},
      analytics: {},
      reward: {},
      ai: {},
      status: 'deprecated',
      deprecated: true,
      replacement: 'core.new-widget',
      render: () => null,
    };
    expect(def.deprecated).toBe(true);
    expect(def.replacement).toBe('core.new-widget');
  });
});
