import { describe, it, expect } from 'vitest';
import {
  DiagnosticSeveritySchema,
  SourceLocationSchema,
  CompilerDiagnosticSchema,
} from './diagnostics.js';

describe('DiagnosticSeveritySchema', () => {
  it('accepts valid severities', () => {
    expect(DiagnosticSeveritySchema.safeParse('error').success).toBe(true);
    expect(DiagnosticSeveritySchema.safeParse('warning').success).toBe(true);
    expect(DiagnosticSeveritySchema.safeParse('info').success).toBe(true);
  });

  it('rejects invalid severity', () => {
    expect(DiagnosticSeveritySchema.safeParse('critical').success).toBe(false);
  });
});

describe('SourceLocationSchema', () => {
  it('accepts valid location', () => {
    const loc = { line: 10, column: 5, offset: 100, file: 'course-spec.md' };
    expect(SourceLocationSchema.safeParse(loc).success).toBe(true);
  });

  it('accepts minimal location', () => {
    expect(SourceLocationSchema.safeParse({ line: 1 }).success).toBe(true);
  });

  it('rejects missing line', () => {
    expect(SourceLocationSchema.safeParse({ column: 5 }).success).toBe(false);
  });
});

describe('CompilerDiagnosticSchema', () => {
  it('accepts valid diagnostic', () => {
    const diag = {
      severity: 'error',
      message: 'Duplicate lesson ID: lesson-1',
      code: 'DUPLICATE_LESSON_ID',
      location: { line: 10, file: 'course-spec.md' },
      hint: 'Rename one of the lessons with id lesson-1',
    };
    expect(CompilerDiagnosticSchema.safeParse(diag).success).toBe(true);
  });

  it('accepts minimal diagnostic', () => {
    expect(CompilerDiagnosticSchema.safeParse({ severity: 'info', message: 'Done' }).success).toBe(
      true,
    );
  });

  it('rejects missing severity', () => {
    const diag = { message: 'Missing severity' };
    expect(CompilerDiagnosticSchema.safeParse(diag).success).toBe(false);
  });

  it('rejects missing message', () => {
    const diag = { severity: 'error' };
    expect(CompilerDiagnosticSchema.safeParse(diag).success).toBe(false);
  });
});
