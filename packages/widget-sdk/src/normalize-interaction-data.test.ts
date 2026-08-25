import { describe, it, expect } from 'vitest';
import { normalizeInteractionData } from './normalize-interaction-data';

describe('normalizeInteractionData', () => {
  it('drag keeps from/to and strips secret', () => {
    expect(normalizeInteractionData('drag', { from: 'A', to: 'B', secret: 'nope' })).toEqual({
      from: 'A',
      to: 'B',
    });
  });

  it('navigate keeps step and strips extra keys', () => {
    expect(normalizeInteractionData('navigate', { step: 2, widgetId: 'x' })).toEqual({ step: 2 });
  });

  it('custom passes key and strips nested objects', () => {
    expect(
      normalizeInteractionData('custom', { step: 1, optionId: 'a', key: 'k', nested: { a: 1 } }),
    ).toEqual({ step: 1, optionId: 'a', key: 'k' });
  });

  it('unknown action returns undefined', () => {
    expect(normalizeInteractionData('nope', { step: 1 })).toBeUndefined();
  });

  it('empty data returns undefined', () => {
    expect(normalizeInteractionData('reveal', {})).toBeUndefined();
  });
});
