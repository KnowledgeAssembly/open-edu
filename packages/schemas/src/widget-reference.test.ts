import { describe, it, expect } from 'vitest';
import { WidgetReferenceSchema } from './widget-reference';

describe('WidgetReferenceSchema', () => {
  it('accepts builtin without integrity', () => {
    expect(
      WidgetReferenceSchema.parse({ id: 'core.matching', version: '1.0.0', source: 'builtin' }),
    ).toMatchObject({ source: 'builtin' });
  });

  it('requires integrity for source registry', () => {
    expect(() =>
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
      }),
    ).toThrow();
  });

  it('allows source url without integrity (legacy normalization)', () => {
    expect(
      WidgetReferenceSchema.parse({
        id: 'open-edu.remote-practice',
        version: '1.0.0',
        source: 'url',
      }),
    ).toMatchObject({ source: 'url' });
  });

  it('accepts a registry ref with valid integrity', () => {
    expect(
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
        registryId: 'reg.example',
        integrity: 'sha256-' + 'a'.repeat(64),
      }),
    ).toMatchObject({ source: 'registry', integrity: 'sha256-' + 'a'.repeat(64) });
  });

  it('rejects a registry ref with malformed integrity', () => {
    expect(() =>
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
        integrity: 'not-a-sha256',
      }),
    ).toThrow();
  });

  it('requires registryId for source registry', () => {
    expect(() =>
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
        integrity: 'sha256-' + 'a'.repeat(64),
      }),
    ).toThrow();
  });

  it('accepts a registry ref with valid integrity and registryId', () => {
    expect(
      WidgetReferenceSchema.parse({
        id: 'community.example.counter',
        version: '1.0.0',
        source: 'registry',
        registryId: 'reg.example',
        integrity: 'sha256-' + 'a'.repeat(64),
      }),
    ).toMatchObject({
      source: 'registry',
      registryId: 'reg.example',
      integrity: 'sha256-' + 'a'.repeat(64),
    });
  });
});
