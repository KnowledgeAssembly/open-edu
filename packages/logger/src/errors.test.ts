import { describe, it, expect } from 'vitest';
import { LoggerError, LoggerConfigError, LoggerWriteError } from './errors.js';

describe('LoggerError', () => {
  it('has name and code', () => {
    const err = new LoggerError('TEST_CODE', 'test message');
    expect(err.name).toBe('LoggerError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });

  it('is instance of Error', () => {
    const err = new LoggerError('X', 'msg');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('LoggerConfigError', () => {
  it('has correct name and code', () => {
    const err = new LoggerConfigError('bad config');
    expect(err.name).toBe('LoggerConfigError');
    expect(err.code).toBe('LOGGER_CONFIG_ERROR');
  });
});

describe('LoggerWriteError', () => {
  it('has correct name and code', () => {
    const err = new LoggerWriteError('disk full');
    expect(err.name).toBe('LoggerWriteError');
    expect(err.code).toBe('LOGGER_WRITE_ERROR');
  });
});
