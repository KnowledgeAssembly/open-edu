import { describe, it } from 'node:test';
import { ok, strictEqual } from 'node:assert';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateCompiledPackage } from '../validate-package.mjs';

function createTempDir() {
  const base = join(tmpdir(), `pkg-validate-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

describe('validate-package', () => {
  it('returns failure when no spec path provided', () => {
    const result = validateCompiledPackage({});
    strictEqual(result.success, false);
    ok(result.phases.length > 0);
    strictEqual(result.phases[0].skippedReason, 'no-spec-path');
  });

  it('skips compile when no compile command available', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');
      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {},
      });
      const compilePhase = result.phases.find((p) => p.name === 'compile');
      ok(compilePhase);
      strictEqual(compilePhase.status, 'skipped');
      strictEqual(compilePhase.skippedReason, 'command-unavailable');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips validate and lint when commands unavailable', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');
      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("ok")'],
        },
      });
      const validatePhase = result.phases.find((p) => p.name === 'validate-package');
      ok(validatePhase);
      strictEqual(validatePhase.status, 'skipped');
      const lintPhase = result.phases.find((p) => p.name === 'lint');
      ok(lintPhase);
      strictEqual(lintPhase.status, 'skipped');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('runs compile and reports success', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');
      const pkgDir = join(dir, 'package');
      mkdirSync(pkgDir, { recursive: true });
      writeFileSync(join(pkgDir, 'package.json'), '{"name":"test"}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("compiled")'],
          validate: ['node', '-e', 'console.log("validated")'],
          lint: ['node', '-e', 'console.log("linted")'],
        },
      });

      ok(result.success);
      const compilePhase = result.phases.find((p) => p.name === 'compile');
      ok(compilePhase);
      strictEqual(compilePhase.status, 'passed');
      ok(compilePhase.stdout.includes('compiled'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stops after compile failure and does not run later phases', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'process.exit(1)'],
          validate: ['node', '-e', 'console.log("should not run")'],
          lint: ['node', '-e', 'console.log("should not run")'],
        },
      });

      strictEqual(result.success, false);
      const compilePhase = result.phases.find((p) => p.name === 'compile');
      strictEqual(compilePhase.status, 'failed');

      const validatePhase = result.phases.find((p) => p.name === 'validate-package');
      strictEqual(validatePhase, undefined, 'validate should not run after compile failure');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports validate failure', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("ok")'],
          validate: ['node', '-e', 'process.exit(2)'],
        },
      });

      strictEqual(result.success, false);
      const validatePhase = result.phases.find((p) => p.name === 'validate-package');
      strictEqual(validatePhase.status, 'failed');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves command evidence in result', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("compiled")'],
          validate: ['node', '-e', 'console.log("validated")'],
          lint: ['node', '-e', 'console.log("linted")'],
        },
      });

      ok(result.commands.length >= 3, 'should have command evidence for all phases');
      ok(result.commands[0].status !== undefined, 'should have status');
      ok(result.commands[0].stdout !== undefined, 'should have stdout');
      ok(result.commands[0].durationMs !== undefined, 'should have duration');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('detects missing package manifest after compile success', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("ok")'],
        },
      });

      strictEqual(result.success, false);
      const manifestPhase = result.phases.find((p) => p.name === 'manifest-check');
      ok(manifestPhase);
      strictEqual(manifestPhase.status, 'failed');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('replace {spec} and {dir} placeholders', () => {
    const dir = createTempDir();
    try {
      const specPath = join(dir, 'course-spec.json');
      writeFileSync(specPath, '{}');

      const result = validateCompiledPackage({
        specPath,
        outputDir: dir,
        commands: {
          compile: ['node', '-e', 'console.log("{spec} {dir}")'],
        },
      });

      strictEqual(result.success, false); // manifest check will fail

      const compilePhase = result.phases.find((p) => p.name === 'compile');
      ok(compilePhase.stdout.includes(dir), 'should have resolved placeholder');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});