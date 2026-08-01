import { LOG_LEVEL_VALUES } from './types.js';
import type {
  LogLevel,
  LogEntry,
  LogSink,
  LoggerOptions,
  ChildLoggerOptions,
  ILogger,
} from './types.js';
import { ConsoleSink } from './sinks/consoleSink.js';

export { type ILogger };

let GLOBAL_MIN_LEVEL: LogLevel = 'info';
let GLOBAL_SINKS: LogSink[] | null = null;

export function configureLogger(config: { minLevel?: LogLevel; sinks?: LogSink[] }): void {
  if (config.minLevel) GLOBAL_MIN_LEVEL = config.minLevel;
  if (config.sinks) GLOBAL_SINKS = config.sinks;
}

export function getGlobalConfig(): { minLevel: LogLevel; sinks: LogSink[] } {
  return { minLevel: GLOBAL_MIN_LEVEL, sinks: GLOBAL_SINKS ?? [new ConsoleSink()] };
}

export function resolveSinks(sinks?: LogSink[]): LogSink[] {
  if (sinks && sinks.length > 0) return sinks;
  if (GLOBAL_SINKS && GLOBAL_SINKS.length > 0) return GLOBAL_SINKS;
  return [new ConsoleSink()];
}

export function deriveLogLevel(
  instanceLevel?: LogLevel,
  envLevel?: string | null,
): LogLevel | undefined {
  if (instanceLevel) return instanceLevel;
  if (envLevel && LOG_LEVEL_VALUES[envLevel as LogLevel] !== undefined) {
    return envLevel as LogLevel;
  }
  return undefined;
}

export class Logger implements ILogger {
  readonly scope: string;
  readonly #minLevelOverride?: LogLevel;
  readonly #sinks: LogSink[];
  readonly #context: Record<string, unknown>;
  readonly #correlationId?: string;
  readonly #timeMarkers: Map<string, number> = new Map();

  constructor(options: LoggerOptions) {
    this.scope = options.scope;
    this.#context = { ...options.context };
    this.#correlationId = options.correlationId;

    const envLevel =
      typeof process !== 'undefined' && process.env?.LOG_LEVEL
        ? process.env.LOG_LEVEL
        : typeof localStorage !== 'undefined'
          ? localStorage.getItem('oe_log_level')
          : null;

    this.#minLevelOverride = deriveLogLevel(options.minLevel, envLevel);
    this.#sinks = resolveSinks(options.sinks);
  }

  child(options: ChildLoggerOptions = {}): Logger {
    const childScope = options.scope ? `${this.scope}:${options.scope}` : this.scope;
    return new Logger({
      scope: childScope,
      minLevel: this.#minLevelOverride,
      sinks: this.#sinks,
      context: { ...this.#context, ...options.context },
      correlationId: options.correlationId ?? this.#correlationId,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.#emit('debug', message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.#emit('info', message, undefined, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.#emit('warn', message, undefined, context);
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    this.#emit('error', message, error, context);
  }

  time(label: string): void {
    const key = `${this.scope}:${label}`;
    this.#timeMarkers.set(key, performance.now());
  }

  timeEnd(label: string): void {
    const key = `${this.scope}:${label}`;
    const start = this.#timeMarkers.get(key);
    if (start === undefined) {
      this.warn(`Timer not started for label: ${label}`);
      return;
    }
    this.#timeMarkers.delete(key);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    this.info(`${label} took ${durationMs}ms`, { label, durationMs });
  }

  #emit(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ): void {
    const minLevel = this.#minLevelOverride ?? getGlobalConfig().minLevel;
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[minLevel]) return;

    let serializedError: LogEntry['error'] | undefined;
    if (error instanceof Error) {
      serializedError = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else if (error !== undefined && error !== null) {
      serializedError = {
        name: 'UnknownError',
        message: String(error),
      };
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      context: { ...this.#context, ...context },
      ...(serializedError ? { error: serializedError } : {}),
      correlationId: this.#correlationId,
    };

    for (const sink of this.#sinks) {
      try {
        sink.write(entry);
      } catch {
        // Sink failure must not crash the application
      }
    }
  }
}

export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}

const DEFAULT_LOGGER = new Logger({ scope: 'open-edu' });

export function defaultLogger(): Logger {
  return DEFAULT_LOGGER;
}
