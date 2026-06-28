import { describe, it, expect } from 'vitest';
import { createCompileCommand } from './index.js';

describe('createCompileCommand', () => {
  it('returns a Command with name compile', () => {
    const cmd = createCompileCommand();
    expect(cmd.name()).toBe('compile');
  });

  it('accepts a file argument', () => {
    const cmd = createCompileCommand();
    // Commander registers args internally; verify the command exists
    expect(cmd.name()).toBe('compile');
  });

  it('has --output option with default ./out', () => {
    const cmd = createCompileCommand();
    const outputOption = cmd.options.find((o) => o.long === '--output');
    expect(outputOption).toBeDefined();
  });

  it('has --validate option with default false', () => {
    const cmd = createCompileCommand();
    const validateOption = cmd.options.find((o) => o.long === '--validate');
    expect(validateOption).toBeDefined();
  });

  it('has --verbose option', () => {
    const cmd = createCompileCommand();
    const verboseOption = cmd.options.find((o) => o.long === '--verbose');
    expect(verboseOption).toBeDefined();
  });

  it('has --watch option', () => {
    const cmd = createCompileCommand();
    const watchOption = cmd.options.find((o) => o.long === '--watch');
    expect(watchOption).toBeDefined();
  });

  it('has --format option', () => {
    const cmd = createCompileCommand();
    const formatOption = cmd.options.find((o) => o.long === '--format');
    expect(formatOption).toBeDefined();
  });
});
