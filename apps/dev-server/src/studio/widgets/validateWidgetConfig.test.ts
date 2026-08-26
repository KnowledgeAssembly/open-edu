import { describe, it, expect } from 'vitest';
import { validateWidgetConfig } from './validateWidgetConfig';

const REQUIRED_SCHEMA = {
  type: 'object',
  properties: { prompt: { type: 'string' } },
  required: ['prompt'],
  additionalProperties: false,
};

describe('validateWidgetConfig', () => {
  it('fails when a required field is missing', () => {
    const result = validateWidgetConfig(REQUIRED_SCHEMA, {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
  });

  it('allows extra properties unless additionalProperties is false', () => {
    const schema = {
      type: 'object',
      properties: { prompt: { type: 'string' } },
    };
    const result = validateWidgetConfig(schema, { prompt: 'x', extra: 1 });
    expect(result.ok).toBe(true);
  });

  it('rejects extra properties when additionalProperties is false', () => {
    const result = validateWidgetConfig(REQUIRED_SCHEMA, { prompt: 'x', extra: 1 });
    expect(result.ok).toBe(false);
  });

  it('returns ok when no schema is provided', () => {
    expect(validateWidgetConfig(undefined, { anything: true })).toEqual({ ok: true });
  });

  it('passes a valid config', () => {
    const result = validateWidgetConfig(REQUIRED_SCHEMA, { prompt: 'Write an essay' });
    expect(result.ok).toBe(true);
  });
});
