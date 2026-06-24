import { describe, it, expect } from 'vitest';
import { RemoteWidgetManifestSchema } from './widget-manifest';

describe('RemoteWidgetManifestSchema', () => {
  const validManifest = {
    id: 'quiz-widget',
    version: '1.0.0',
    url: 'https://cdn.example.com/widgets/quiz.js',
    apiVersion: '1.0.0',
  };

  it('should accept a valid manifest', () => {
    expect(RemoteWidgetManifestSchema.parse(validManifest)).toEqual(validManifest);
  });

  it('should accept manifest with all optional fields', () => {
    const full = {
      ...validManifest,
      integrity: 'sha256-abc123def456',
      fallback: 'builtin-quiz',
      permissions: ['storage', 'network'],
    };
    expect(RemoteWidgetManifestSchema.parse(full)).toEqual(full);
  });

  it('should reject missing id', () => {
    const { id: _id, ...rest } = validManifest;
    expect(() => RemoteWidgetManifestSchema.parse(rest)).toThrow();
  });

  it('should reject empty id', () => {
    expect(() => RemoteWidgetManifestSchema.parse({ ...validManifest, id: '' })).toThrow();
  });

  it('should reject missing version', () => {
    const { version: _v, ...rest } = validManifest;
    expect(() => RemoteWidgetManifestSchema.parse(rest)).toThrow();
  });

  it('should reject empty version', () => {
    expect(() => RemoteWidgetManifestSchema.parse({ ...validManifest, version: '' })).toThrow();
  });

  it('should reject missing url', () => {
    const { url: _u, ...rest } = validManifest;
    expect(() => RemoteWidgetManifestSchema.parse(rest)).toThrow();
  });

  it('should reject empty url', () => {
    expect(() => RemoteWidgetManifestSchema.parse({ ...validManifest, url: '' })).toThrow();
  });

  it('should reject http:// url (non-localhost)', () => {
    expect(() =>
      RemoteWidgetManifestSchema.parse({ ...validManifest, url: 'http://evil.com/widget.js' }),
    ).toThrow();
  });

  it('should accept https:// url', () => {
    const m = RemoteWidgetManifestSchema.parse({ ...validManifest, url: 'https://cdn.example.com/widget.js' });
    expect(m.url).toBe('https://cdn.example.com/widget.js');
  });

  it('should reject file:// url', () => {
    expect(() =>
      RemoteWidgetManifestSchema.parse({ ...validManifest, url: 'file:///tmp/widget.js' }),
    ).toThrow();
  });

  it('should reject missing apiVersion', () => {
    const { apiVersion: _a, ...rest } = validManifest;
    expect(() => RemoteWidgetManifestSchema.parse(rest)).toThrow();
  });

  it('should strip unexpected fields', () => {
    const result = RemoteWidgetManifestSchema.parse({
      ...validManifest,
      extraField: 'should be removed',
    });
    expect(result).not.toHaveProperty('extraField');
  });

  it('should reject invalid URL syntax', () => {
    expect(() =>
      RemoteWidgetManifestSchema.parse({ ...validManifest, url: 'not-a-url' }),
    ).toThrow();
  });

  it('should reject non-string integrity', () => {
    expect(() =>
      RemoteWidgetManifestSchema.parse({ ...validManifest, integrity: 123 }),
    ).toThrow();
  });

  it('should reject non-array permissions', () => {
    expect(() =>
      RemoteWidgetManifestSchema.parse({ ...validManifest, permissions: 'read' }),
    ).toThrow();
  });
});
