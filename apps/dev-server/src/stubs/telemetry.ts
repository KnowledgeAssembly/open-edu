export const TELEMETRY_VERSION = '0.0.0';

export class TelemetrySession {
  start(): this {
    return this
  }
  stop(): void {}
}

export function createSummary(): { events: never[] } {
  return { events: [] }
}

export class TelemetryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TelemetryError'
  }
}

export class TelemetryValidationError extends TelemetryError {}
export class TelemetryPersistenceError extends TelemetryError {}
