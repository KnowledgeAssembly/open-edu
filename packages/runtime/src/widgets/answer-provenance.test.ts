import { describe, it, expect } from 'vitest';
import { buildWidgetAnswer } from './answer-provenance';

describe('buildWidgetAnswer', () => {
  it('sets renderedViaFallback when intended and rendered ids differ', () => {
    const answer = buildWidgetAnswer({
      intendedWidgetId: 'community.example.quiz',
      intendedWidgetVersion: '2.0.0',
      renderedWidgetId: 'core.multiple-choice',
      renderedWidgetVersion: '1.0.0',
      data: { choice: 'a' },
      score: 100,
    });
    expect(answer.widgetId).toBe('core.multiple-choice');
    expect(answer.renderedViaFallback).toBe(true);
    expect(answer.intendedWidgetId).toBe('community.example.quiz');
  });

  it('sets renderedViaFallback false when identities match', () => {
    const answer = buildWidgetAnswer({
      intendedWidgetId: 'core.matching',
      renderedWidgetId: 'core.matching',
      data: {},
    });
    expect(answer.renderedViaFallback).toBe(false);
    expect(answer.widgetId).toBe('core.matching');
  });
});
