import { describe, it, expect } from 'vitest';
import { loadManifest } from './manifest';
import { ManifestValidationError } from './errors';
import { resolve, join } from 'node:path';

const fixturesDir = resolve(__dirname, '__fixtures__');

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
