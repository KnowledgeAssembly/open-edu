export class TelemetryError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'TelemetryError';
    this.code = code;
  }
}

export class TelemetryValidationError extends TelemetryError {
  public readonly zodError: unknown;
  constructor(message: string, zodError: unknown) {
    super('TELEMETRY_VALIDATION_ERROR', message);
    this.name = 'TelemetryValidationError';
    this.zodError = zodError;
  }
}

export class TelemetryPersistenceError extends TelemetryError {
  constructor(message: string) {
    super('TELEMETRY_PERSISTENCE_ERROR', message);
    this.name = 'TelemetryPersistenceError';
  }
}
