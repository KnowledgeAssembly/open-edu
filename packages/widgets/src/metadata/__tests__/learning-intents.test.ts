import { describe, it, expect } from 'vitest';
import {
  LearningIntent,
  getLearningIntentsForWidget,
  getWidgetsByLearningIntent,
} from '../learning-intents';

describe('LearningIntent', () => {
  it('defines all 8 learning intents', () => {
    const intents = Object.values(LearningIntent);
    expect(intents).toContain('assess');
    expect(intents).toContain('practice');
    expect(intents).toContain('observe');
    expect(intents).toContain('compare');
    expect(intents).toContain('explore');
    expect(intents).toContain('create');
    expect(intents).toContain('reflect');
    expect(intents).toContain('apply');
    expect(intents).toHaveLength(8);
  });

  it('maps matching widget to practice and compare intents', () => {
    const intents = getLearningIntentsForWidget('core.matching');
    expect(intents).toContain('practice');
    expect(intents).toContain('compare');
  });

  it('maps multiple-choice widget to assess intent', () => {
    const intents = getLearningIntentsForWidget('core.multiple-choice');
    expect(intents).toContain('assess');
  });

  it('returns empty array for unknown widget', () => {
    const intents = getLearningIntentsForWidget('unknown.widget');
    expect(intents).toEqual([]);
  });

  it('finds all widgets for a given intent', () => {
    const widgets = getWidgetsByLearningIntent(LearningIntent.Assess);
    expect(widgets).toContain('core.multiple-choice');
    expect(widgets.length).toBeGreaterThan(0);
  });

  it('supports multiple intents per widget', () => {
    const intents = getLearningIntentsForWidget('core.drag-drop');
    expect(intents.length).toBeGreaterThanOrEqual(2);
  });
});