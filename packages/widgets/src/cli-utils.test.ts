import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateWidgetPackage } from './cli-utils';

function createTempDir(): string {
  const dir = join(tmpdir(), `widget-test-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeJson(dir: string, file: string, data: Record<string, unknown>): void {
  writeFileSync(join(dir, file), JSON.stringify(data), 'utf-8');
}

describe('validateWidgetPackage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should validate a valid widget package', () => {
    writeJson(tmpDir, 'package.json', {
      name: 'my-widget',
      peerDependencies: {
        '@open-edu/widgets': 'workspace:*',
        react: '^18.0.0',
      },
    });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.tsx'), '', 'utf-8');

    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should report missing package.json', () => {
    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      file: 'package.json',
      message: 'package.json not found',
    });
  });

  it('should report missing peerDependency @open-edu/widgets', () => {
    writeJson(tmpDir, 'package.json', {
      name: 'my-widget',
      peerDependencies: { react: '^18.0.0' },
    });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.tsx'), '', 'utf-8');

    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      file: 'package.json',
      message: 'Missing peerDependency: @open-edu/widgets',
    });
  });

  it('should report missing peerDependency react', () => {
    writeJson(tmpDir, 'package.json', {
      name: 'my-widget',
      peerDependencies: { '@open-edu/widgets': 'workspace:*' },
    });
    mkdirSync(join(tmpDir, 'src'), { recursive: true });
    writeFileSync(join(tmpDir, 'src', 'index.tsx'), '', 'utf-8');

    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      file: 'package.json',
      message: 'Missing peerDependency: react',
    });
  });

  it('should report missing src/index.tsx', () => {
    writeJson(tmpDir, 'package.json', {
      name: 'my-widget',
      peerDependencies: {
        '@open-edu/widgets': 'workspace:*',
        react: '^18.0.0',
      },
    });

    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      file: 'src/index.tsx',
      message: 'Widget entry file not found',
    });
  });

  it('should return valid=false for invalid JSON', () => {
    writeFileSync(join(tmpDir, 'package.json'), '{invalid}', 'utf-8');
    const result = validateWidgetPackage(tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      file: 'package.json',
      message: 'Invalid JSON',
    });
  });
});
