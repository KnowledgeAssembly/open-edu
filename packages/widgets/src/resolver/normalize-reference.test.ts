import { describe, expect, it } from 'vitest';
import { normalizeWidgetReference } from './normalize-reference.js';

const remoteWidgetNoIntegrity = {
  id: 'remote.matching',
  version: '1.2.3',
  url: 'https://widgets.example.com/matching.js',
  apiVersion: '0.2.0',
};

const remoteWidgetWithIntegrity = {
  ...remoteWidgetNoIntegrity,
  integrity: 'sha256-' + 'a'.repeat(64),
};

describe('normalizeWidgetReference', () => {
  it('normalizes a custom remoteWidget without integrity into a url ref with warnings', () => {
    const { ref, warnings } = normalizeWidgetReference({
      remoteWidget: remoteWidgetNoIntegrity,
    });

    expect(ref).toEqual({
      id: 'remote.matching',
      version: '1.2.3',
      source: 'url',
    });
    expect(ref.source).toBe('url');
    expect(warnings.map((w) => w.code).sort()).toEqual(['legacy-url-source', 'missing-integrity']);
  });

  it('emits only legacy-url-source when remoteWidget has integrity', () => {
    const { ref, warnings } = normalizeWidgetReference({
      remoteWidget: remoteWidgetWithIntegrity,
    });

    expect(ref).toEqual({
      id: 'remote.matching',
      version: '1.2.3',
      source: 'url',
      integrity: 'sha256-' + 'a'.repeat(64),
    });
    expect(warnings.map((w) => w.code)).toEqual(['legacy-url-source']);
  });

  it('passes through a registry widgetRef unchanged', () => {
    const widgetRef = {
      id: 'registry.matching',
      version: '1.0.0',
      source: 'registry' as const,
      integrity: 'sha256-' + 'b'.repeat(64),
    };

    const result = normalizeWidgetReference({ widgetRef });

    expect(result).toEqual({
      ref: widgetRef,
      warnings: [],
    });
  });

  it('normalizes a builtin node into a builtin ref', () => {
    const { ref, warnings } = normalizeWidgetReference({
      widget: 'core.matching',
      version: '1.0.0',
    });

    expect(ref).toEqual({
      id: 'core.matching',
      version: '1.0.0',
      source: 'builtin',
    });
    expect(warnings).toEqual([]);
  });

  it('produces a default builtin ref for a bare node', () => {
    const { ref, warnings } = normalizeWidgetReference({});

    expect(ref).toEqual({
      id: 'exercise',
      version: '0.0.0',
      source: 'builtin',
    });
    expect(warnings).toEqual([]);
  });

  it('gives widgetRef priority over remoteWidget', () => {
    const widgetRef = {
      id: 'registry.priority',
      version: '2.0.0',
      source: 'builtin' as const,
    };

    const { ref, warnings } = normalizeWidgetReference({
      remoteWidget: remoteWidgetNoIntegrity,
      widgetRef,
    });

    expect(ref).toEqual(widgetRef);
    expect(warnings).toEqual([]);
  });
});
