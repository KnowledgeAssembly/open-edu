import { describe, it, expect } from 'vitest';
import { normalizeWidgetInteraction } from './normalize-interaction';

describe('normalizeWidgetInteraction', () => {
  it('keeps allowlisted keys and drops nested huge payloads', () => {
    const event = normalizeWidgetInteraction('core.matching', {
      action: 'reveal',
      step: 2,
      secret: { nested: 'nope' },
    });
    expect(event).toEqual({
      event: 'widget_interaction',
      widgetId: 'core.matching',
      action: 'reveal',
      data: { step: 2 },
    });
  });

  it('returns null when action is missing or not a string', () => {
    expect(normalizeWidgetInteraction('core.matching', { step: 1 })).toBeNull();
  });
});
