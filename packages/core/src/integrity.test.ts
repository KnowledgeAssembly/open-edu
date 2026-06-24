import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeFileHash, verifyIntegrity } from './integrity';

describe('computeFileHash', () => {
  it('should produce a 64-char hex SHA-256 hash', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-hash-'));
    const filePath = join(dir, 'test.txt');
    writeFileSync(filePath, 'hello world');
    const hash = computeFileHash(filePath);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should produce consistent hashes for same content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-consist-'));
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    writeFileSync(a, 'same content');
    writeFileSync(b, 'same content');
    expect(computeFileHash(a)).toBe(computeFileHash(b));
    rmSync(dir, { recursive: true, force: true });
  });

  it('should produce different hashes for different content', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-diff-'));
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    writeFileSync(a, 'content A');
    writeFileSync(b, 'content B');
    expect(computeFileHash(a)).not.toBe(computeFileHash(b));
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('verifyIntegrity', () => {
  it('should return missing manifest when open-edu-build.json does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-no-manifest-'));
    const result = verifyIntegrity(dir);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('open-edu-build.json');
    rmSync(dir, { recursive: true, force: true });
  });

  it('should pass integrity check for unchanged files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-pass-'));
    writeFileSync(join(dir, 'hello.txt'), 'hello world');
    writeFileSync(join(dir, 'nested.txt'), 'nested content');
    mkdirSync(join(dir, 'nodes'), { recursive: true });
    writeFileSync(join(dir, 'nodes', 'lesson.md'), '# Lesson');

    const hashHello = computeFileHash(join(dir, 'hello.txt'));
    const hashNested = computeFileHash(join(dir, 'nested.txt'));
    const hashLesson = computeFileHash(join(dir, 'nodes', 'lesson.md'));

    const manifest = {
      packageId: 'test-pkg',
      packageVersion: '1.0.0',
      builtAt: '2025-01-01T00:00:00.000Z',
      openEduVersion: '0.1.0',
      files: [
        { path: 'hello.txt', hash: hashHello },
        { path: 'nested.txt', hash: hashNested },
        { path: 'nodes/lesson.md', hash: hashLesson },
      ],
      entry: 'nodes/lesson.md',
    };

    writeFileSync(join(dir, 'open-edu-build.json'), JSON.stringify(manifest));

    const result = verifyIntegrity(dir);
    expect(result.valid).toBe(true);
    expect(result.mismatches).toHaveLength(0);
    expect(result.missing).toHaveLength(0);
    expect(result.checked).toBe(3);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should fail when a file has been tampered with', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-tamper-'));
    writeFileSync(join(dir, 'hello.txt'), 'original content');

    const originalHash = computeFileHash(join(dir, 'hello.txt'));

    const manifest = {
      packageId: 'test-pkg',
      packageVersion: '1.0.0',
      builtAt: '2025-01-01T00:00:00.000Z',
      openEduVersion: '0.1.0',
      files: [{ path: 'hello.txt', hash: originalHash }],
      entry: 'nodes/lesson.md',
    };

    writeFileSync(join(dir, 'open-edu-build.json'), JSON.stringify(manifest));

    writeFileSync(join(dir, 'hello.txt'), 'tampered content');

    const result = verifyIntegrity(dir);
    expect(result.valid).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]!.path).toBe('hello.txt');
    expect(result.mismatches[0]!.expected).toBe(originalHash);
    expect(result.mismatches[0]!.actual).not.toBe(originalHash);
    rmSync(dir, { recursive: true, force: true });
  });

  it('should report missing files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-missing-'));
    writeFileSync(join(dir, 'existing.txt'), 'exists');

    const manifest = {
      packageId: 'test-pkg',
      packageVersion: '1.0.0',
      builtAt: '2025-01-01T00:00:00.000Z',
      openEduVersion: '0.1.0',
      files: [
        { path: 'existing.txt', hash: computeFileHash(join(dir, 'existing.txt')) },
        { path: 'missing.txt', hash: 'abc123' },
      ],
      entry: 'nodes/lesson.md',
    };

    writeFileSync(join(dir, 'open-edu-build.json'), JSON.stringify(manifest));

    const result = verifyIntegrity(dir);
    expect(result.valid).toBe(false);
    expect(result.missing).toContain('missing.txt');
    rmSync(dir, { recursive: true, force: true });
  });

  it('should ignore .edu/ and telemetry/ files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'integ-ignore-'));
    writeFileSync(join(dir, 'keep.txt'), 'keep me');

    const hashKeep = computeFileHash(join(dir, 'keep.txt'));

    const manifest = {
      packageId: 'test-pkg',
      packageVersion: '1.0.0',
      builtAt: '2025-01-01T00:00:00.000Z',
      openEduVersion: '0.1.0',
      files: [
        { path: 'keep.txt', hash: hashKeep },
        { path: '.edu/state.json', hash: 'should-be-ignored' },
        { path: 'telemetry/events.jsonl', hash: 'should-be-ignored' },
      ],
      entry: 'nodes/lesson.md',
    };

    writeFileSync(join(dir, 'open-edu-build.json'), JSON.stringify(manifest));

    const result = verifyIntegrity(dir);
    expect(result.valid).toBe(true);
    expect(result.checked).toBe(1);
    rmSync(dir, { recursive: true, force: true });
  });
});
