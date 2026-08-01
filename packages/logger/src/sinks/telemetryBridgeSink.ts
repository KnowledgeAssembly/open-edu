import type { LogSink, LogEntry } from '../types.js';

export type TelemetryBridgeHandler = (entry: LogEntry) => void | Promise<void>;

export interface TelemetryBridgeSinkOptions {
  onDiagnostic: TelemetryBridgeHandler;
  levels?: Array<'warn' | 'error'>;
}

export class TelemetryBridgeSink implements LogSink {
  readonly #onDiagnostic: TelemetryBridgeHandler;
  readonly #levels: ReadonlySet<string>;

  constructor(options: TelemetryBridgeSinkOptions) {
    this.#onDiagnostic = options.onDiagnostic;
    this.#levels = new Set(options.levels ?? ['warn', 'error']);
  }

  write(entry: LogEntry): void {
    if (this.#levels.has(entry.level)) {
      void this.#onDiagnostic(entry);
    }
  }
}
