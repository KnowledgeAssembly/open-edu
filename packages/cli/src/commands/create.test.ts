import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createPackage } from './create';

let tempDir: string;

beforeEach(() => {
  tempDir = resolve(tmpdir(), `edu-create-test-${Date.now()}`);
});

afterEach(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('createPackage', () => {
  it('should create a minimal valid package in empty directory', async () => {
    const result = await createPackage(tempDir, {
      id: 'test-pkg',
      title: 'Test Package',
      author: 'Test Author',
    });

    expect(result.success).toBe(true);
    expect(result.files).toEqual([
      'package.json',
      'workflow.json',
      'nodes/intro.md',
      'validate.test.ts',
    ]);

    expect(existsSync(join(tempDir, 'package.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'workflow.json'))).toBe(true);
    expect(existsSync(join(tempDir, 'nodes/intro.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'validate.test.ts'))).toBe(true);
  });

  it('should fail if directory is not empty and no --force', async () => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, 'dummy.txt'), 'hello', 'utf-8');

    const result = await createPackage(tempDir, {
      id: 'test-pkg',
      title: 'Test Package',
      author: 'Test Author',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not empty');
  });

  it('should force overwrite non-empty directory with --force', async () => {
    mkdirSync(tempDir, { recursive: true });
    writeFileSync(join(tempDir, 'dummy.txt'), 'hello', 'utf-8');

    const result = await createPackage(tempDir, {
      id: 'overwrite-pkg',
      title: 'Overwrite',
      author: 'Me',
      force: true,
    });

    expect(result.success).toBe(true);
    expect(existsSync(join(tempDir, 'package.json'))).toBe(true);
  });

  it('should fail on invalid package ID', async () => {
    const result = await createPackage(tempDir, {
      id: 'INVALID ID!',
      title: 'Test',
      author: 'Test',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid package ID');
  });

  it('should create valid manifest JSON', async () => {
    await createPackage(tempDir, {
      id: 'my-pkg',
      title: 'My Package',
      author: 'Me',
    });

    const manifest = JSON.parse(readFileSync(join(tempDir, 'package.json'), 'utf-8'));
    expect(manifest.id).toBe('my-pkg');
    expect(manifest.title).toBe('My Package');
    expect(manifest.author).toBe('Me');
    expect(manifest.version).toBe('0.1.0');
    expect(manifest.entry).toBe('nodes/intro.md');
  });
});
