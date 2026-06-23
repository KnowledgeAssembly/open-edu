import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_VERSION,
  TelemetryEmitter,
  JsonlPersister,
  TelemetrySession,
  TelemetryError,
  TelemetryValidationError,
  TelemetryPersistenceError,
} from './index';

describe('@open-edu/telemetry exports', () => {
  it('should export a version', () => {
    expect(TELEMETRY_VERSION).toBe('0.1.0');
  });

  it('should export TelemetryEmitter', () => {
    expect(TelemetryEmitter).toBeDefined();
  });

  it('should export JsonlPersister', () => {
    expect(JsonlPersister).toBeDefined();
  });

  it('should export TelemetrySession', () => {
    expect(TelemetrySession).toBeDefined();
  });

  it('should export error classes', () => {
    expect(TelemetryError).toBeDefined();
    expect(TelemetryValidationError).toBeDefined();
    expect(TelemetryPersistenceError).toBeDefined();
  });
});
