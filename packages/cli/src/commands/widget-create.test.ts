import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { widgetCreate } from './widget-create';

function createTempDir(): string {
  const dir = join(tmpdir(), `widget-create-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('widgetCreate', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create widget files in an empty directory', async () => {
    const targetDir = join(tmpDir, 'my-custom-widget');
    const result = await widgetCreate(targetDir, { id: 'my-custom-widget' });

    expect(result.success).toBe(true);
    expect(result.files).toBeDefined();
    expect(result.files).toContain('package.json');
    expect(result.files).toContain('src/index.tsx');
    expect(result.files).toContain('src/index.test.tsx');

    // Verify package.json was templated
    const pkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('my-custom-widget');
  });

  it('should reject invalid widget IDs', async () => {
    const targetDir = join(tmpDir, 'invalid');
    const result = await widgetCreate(targetDir, { id: 'My Invalid Widget!' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid widget ID');
  });

  it('should reject non-empty directory without --force', async () => {
    const targetDir = join(tmpDir, 'nonempty');
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'existing.txt'), 'hello', 'utf-8');

    const result = await widgetCreate(targetDir, { id: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not empty');
  });

  it('should overwrite non-empty directory with --force', async () => {
    const targetDir = join(tmpDir, 'force-overwrite');
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, 'existing.txt'), 'hello', 'utf-8');

    const result = await widgetCreate(targetDir, { id: 'force-test', force: true });

    expect(result.success).toBe(true);
    expect(result.files).toContain('package.json');
    expect(existsSync(join(targetDir, 'package.json'))).toBe(true);
  });

  it('should replace the widget ID placeholder in src/index.tsx', async () => {
    const targetDir = join(tmpDir, 'placeholder-test');
    const result = await widgetCreate(targetDir, { id: 'placeholder-test' });

    expect(result.success).toBe(true);

    const content = readFileSync(join(targetDir, 'src', 'index.tsx'), 'utf-8');
    expect(content).toContain('placeholder-test');
  });

  it('should use the title option when provided', async () => {
    const targetDir = join(tmpDir, 'title-test');
    const result = await widgetCreate(targetDir, { id: 'title-test', title: 'My Test Widget' });

    expect(result.success).toBe(true);
    expect(result.files).toContain('package.json');
  });
});
