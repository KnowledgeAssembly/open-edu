export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | { name: string; message: string; stack?: string };
  correlationId?: string;
}

export interface LogSink {
  write(entry: LogEntry): void;
  flush?(): Promise<void>;
  close?(): Promise<void>;
}

export interface LoggerOptions {
  scope: string;
  minLevel?: LogLevel;
  sinks?: LogSink[];
  context?: Record<string, unknown>;
  correlationId?: string;
}

export interface ChildLoggerOptions {
  scope?: string;
  context?: Record<string, unknown>;
  correlationId?: string;
}

export interface TimeMarker {
  label: string;
  startTime: number;
}

export interface GlobalConfig {
  minLevel: LogLevel;
  sinks: LogSink[];
}

export interface LoggerErrorPayload {
  name: string;
  message: string;
  stack?: string;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
  time(label: string): void;
  timeEnd(label: string): void;
  child(options?: ChildLoggerOptions): ILogger;
}
