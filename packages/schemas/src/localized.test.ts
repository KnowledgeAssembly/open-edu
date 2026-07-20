import { describe, it, expect } from 'vitest';
import { LocalizedSchema, localizedField, isLocalized, extractLocalized } from './localized.js';

describe('LocalizedSchema', () => {
  it('accepts a plain string', () => {
    const result = LocalizedSchema.safeParse('Hello');
    expect(result.success).toBe(true);
  });

  it('accepts a localized record', () => {
    const result = LocalizedSchema.safeParse({ en: 'Hello', hi: 'नमस्ते' });
    expect(result.success).toBe(true);
  });

  it('rejects empty objects', () => {
    const result = LocalizedSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string values in record', () => {
    const result = LocalizedSchema.safeParse({ en: 123 });
    expect(result.success).toBe(false);
  });
});

describe('isLocalized', () => {
  it('returns false for plain strings', () => {
    expect(isLocalized('Hello')).toBe(false);
  });

  it('returns true for localized records', () => {
    expect(isLocalized({ en: 'Hello', hi: 'नमस्ते' })).toBe(true);
  });
});

describe('localizedField', () => {
  it('accepts a plain string', () => {
    const schema = localizedField();
    expect(schema.safeParse('Hello').success).toBe(true);
  });

  it('accepts a localized record', () => {
    const schema = localizedField();
    expect(schema.safeParse({ en: 'Hello', hi: 'नमस्ते' }).success).toBe(true);
  });

  it('rejects empty objects', () => {
    const schema = localizedField();
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('enforces max length on strings', () => {
    const schema = localizedField(5);
    expect(schema.safeParse('Hello').success).toBe(true);
    expect(schema.safeParse('Too long').success).toBe(false);
  });

  it('enforces max length on record values', () => {
    const schema = localizedField(5);
    expect(schema.safeParse({ en: 'Hello' }).success).toBe(true);
    expect(schema.safeParse({ en: 'Too long' }).success).toBe(false);
  });
});

describe('extractLocalized', () => {
  it('returns the string directly for plain strings', () => {
    expect(extractLocalized('Hello', 'en')).toBe('Hello');
  });

  it('extracts the requested locale', () => {
    expect(extractLocalized({ en: 'Hello', hi: 'नमस्ते' }, 'hi')).toBe('नमस्ते');
  });

  it('falls back to English when locale is missing', () => {
    expect(extractLocalized({ en: 'Hello' }, 'hi')).toBe('Hello');
  });

  it('falls back to the first available value', () => {
    expect(extractLocalized({ hi: 'नमस्ते' }, 'fr')).toBe('नमस्ते');
  });
});
