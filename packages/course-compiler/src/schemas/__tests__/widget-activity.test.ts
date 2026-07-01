import { describe, it, expect } from 'vitest';
import { WidgetActivitySchema, ActivitySchema } from '../course-model.js';

describe('WidgetActivitySchema', () => {
  it('accepts valid widget activity', () => {
    const result = WidgetActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      widgetId: 'open-edu.matching',
      config: { pairs: [] },
    });
    expect(result.success).toBe(true);
  });

  it('rejects when widgetId is missing', () => {
    const result = WidgetActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      config: {},
    });
    expect(result.success).toBe(false);
  });

  it('allows empty config', () => {
    const result = WidgetActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      widgetId: 'test.widget',
      config: {},
    });
    expect(result.success).toBe(true);
  });

  it('preserves optional description', () => {
    const result = WidgetActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      widgetId: 'test.widget',
      config: {},
      description: 'Match the items',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Match the items');
    }
  });

  it('rejects extra fields via strict mode', () => {
    const result = WidgetActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      widgetId: 'test.widget',
      config: {},
      unknownField: 'should not be here',
    });
    expect(result.success).toBe(false);
  });
});

describe('ActivitySchema discriminated union with widget', () => {
  it('parses a reading activity (existing behavior preserved)', () => {
    const result = ActivitySchema.safeParse({
      type: 'reading',
      id: 'r1',
      content: 'Read this text.',
    });
    expect(result.success).toBe(true);
  });

  it('parses a widget activity via discriminated union', () => {
    const result = ActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      widgetId: 'open-edu.matching',
      config: { pairs: [] },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('widget');
    }
  });

  it('rejects widget activity without widgetId via discriminated union', () => {
    const result = ActivitySchema.safeParse({
      id: 'w1',
      type: 'widget',
      config: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown type in discriminated union', () => {
    const result = ActivitySchema.safeParse({
      id: 'x1',
      type: 'unknown',
    });
    expect(result.success).toBe(false);
  });
});
