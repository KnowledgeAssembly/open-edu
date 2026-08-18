import { describe, it, expect } from 'vitest';
import { loadManifest, parseManifest } from './manifest';
import { ManifestValidationError } from './errors';
import { resolve, join } from 'node:path';

const fixturesDir = resolve(__dirname, '__fixtures__');

const VALID_MANIFEST = JSON.stringify({
  id: 'my-package',
  title: 'My Package',
  version: '0.1.0',
  author: 'Your Name',
  entry: 'nodes/intro.md',
});

describe('parseManifest', () => {
  it('parses a valid manifest', () => {
    const manifest = parseManifest(VALID_MANIFEST);
    expect(manifest.id).toBe('my-package');
    expect(manifest.entry).toBe('nodes/intro.md');
  });

  it('rejects malformed JSON', () => {
    try {
      parseManifest('{not json');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      expect((err as ManifestValidationError).code).toBe('MANIFEST_VALIDATION_ERROR');
    }
  });

  it('rejects a schema-invalid manifest', () => {
    try {
      parseManifest(JSON.stringify({ id: 'missing-the-rest' }));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      expect((err as ManifestValidationError).zodError).not.toBeNull();
    }
  });

  it('uses a logical file path in error context (never a host root)', () => {
    try {
      parseManifest('{bad', 'package.json');
      expect.fail('should have thrown');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).toContain('package.json');
      expect(message).not.toContain('/');
      expect(message).not.toContain('\\');
    }
  });

  it('mentions the logical path for schema errors', () => {
    try {
      parseManifest(JSON.stringify({ id: 42 }), 'package.json');
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as Error).message).toContain('package.json');
    }
  });

  it('parses the browser-studio fixture manifest from bytes', () => {
    const manifest = parseManifest(
      JSON.stringify({
        id: 'browser-studio',
        title: 'Browser Studio Composite',
        version: '1.0.0',
        author: 'Open-Edu',
        entry: 'nodes/lesson.md',
      }),
    );
    expect(manifest.id).toBe('browser-studio');
  });
});

describe('loadManifest', () => {
  it('should load a valid manifest', async () => {
    const manifest = await loadManifest(join(fixturesDir, 'valid-package'));
    expect(manifest.id).toBe('intro-to-variables');
    expect(manifest.title).toBe('Introduction to Variables');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.author).toBe('Open-Edu');
    expect(manifest.entry).toBe('nodes/lesson-01.md');
  });

  it('should load a minimal manifest', async () => {
    const manifest = await loadManifest(join(fixturesDir, 'minimal-package'));
    expect(manifest.id).toBe('minimal');
  });

  it('should reject missing package.json', async () => {
    await expect(loadManifest(join(fixturesDir, 'nonexistent'))).rejects.toThrow(
      ManifestValidationError,
    );
  });

  it('should reject invalid manifest', async () => {
    await expect(loadManifest(join(fixturesDir, 'broken-package'))).rejects.toThrow(
      ManifestValidationError,
    );
  });

  it('should include Zod error details in rejection', async () => {
    try {
      await loadManifest(join(fixturesDir, 'broken-package'));
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ManifestValidationError);
      expect((err as ManifestValidationError).zodError).not.toBeNull();
    }
  });
});
