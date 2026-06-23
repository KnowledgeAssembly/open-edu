import { describe, it, expect } from 'vitest';
import { TelemetryError, TelemetryValidationError, TelemetryPersistenceError } from './errors';

describe('TelemetryError', () => {
  it('should set name and code', () => {
    const err = new TelemetryError('TEST_CODE', 'test message');
    expect(err.name).toBe('TelemetryError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });
});

describe('TelemetryValidationError', () => {
  it('should extend TelemetryError with zodError', () => {
    const zodErr = new Error('parse failed');
    const err = new TelemetryValidationError('invalid', zodErr);
    expect(err.name).toBe('TelemetryValidationError');
    expect(err.code).toBe('TELEMETRY_VALIDATION_ERROR');
    expect(err.zodError).toBe(zodErr);
  });
});

describe('TelemetryPersistenceError', () => {
  it('should extend TelemetryError', () => {
    const err = new TelemetryPersistenceError('write failed');
    expect(err.name).toBe('TelemetryPersistenceError');
    expect(err.code).toBe('TELEMETRY_PERSISTENCE_ERROR');
  });
});
