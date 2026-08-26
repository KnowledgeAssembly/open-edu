import { describe, it, expect } from 'vitest';
import type { CuratedWidget } from './curatedCatalog';
import { toExportedWidgetRef, registryIsConfigured } from './widgetRefExport';

describe('toExportedWidgetRef', () => {
  it('exports a builtin widget with a fallback and NO integrity', () => {
    const builtin: CuratedWidget = {
      id: 'core.matching',
      version: '1.2.0',
      source: 'builtin',
      trustTier: 'native',
      name: 'Matching',
    };
    const ref = toExportedWidgetRef(builtin, 'core.fallback');
    expect(ref).toEqual({
      id: 'core.matching',
      version: '1.2.0',
      source: 'builtin',
      fallback: 'core.fallback',
    });
    expect('integrity' in ref).toBe(false);
  });

  it('throws when exporting a registry widget without integrity', () => {
    const registry: CuratedWidget = {
      id: 'community.example.counter',
      version: '1.0.0',
      source: 'registry',
      trustTier: 'sandboxed',
      registryId: 'example-registry',
      name: 'Counter',
    };
    expect(() => toExportedWidgetRef(registry)).toThrow(/integrity/);
  });

  it('exports a registry widget with integrity and registryId', () => {
    const registry: CuratedWidget = {
      id: 'community.example.counter',
      version: '1.0.0',
      source: 'registry',
      trustTier: 'sandboxed',
      registryId: 'example-registry',
      name: 'Counter',
      integrity: 'sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    };
    const ref = toExportedWidgetRef(registry);
    expect(ref).toMatchObject({
      id: 'community.example.counter',
      version: '1.0.0',
      source: 'registry',
      registryId: 'example-registry',
      integrity: 'sha256-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    });
    expect('fallback' in ref).toBe(false);
  });
});

describe('registryIsConfigured', () => {
  it('returns true for a configured registry id', () => {
    expect(registryIsConfigured('example-registry', new Set(['example-registry']))).toBe(true);
  });

  it('returns false for an unknown registry id', () => {
    expect(registryIsConfigured('unknown-registry', new Set(['example-registry']))).toBe(false);
  });
});
