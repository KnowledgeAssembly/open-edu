export { LOGGER_VERSION } from './version.js';

export { Logger, createLogger, defaultLogger, configureLogger, getGlobalConfig } from './logger.js';
export type { ILogger } from './logger.js';

export type {
  LogLevel,
  LogEntry,
  LogSink,
  LoggerOptions,
  ChildLoggerOptions,
  TimeMarker,
  GlobalConfig,
} from './types.js';

export { LOG_LEVELS, LOG_LEVEL_VALUES } from './types.js';

export { ConsoleSink } from './sinks/consoleSink.js';
export { MemorySink } from './sinks/memorySink.js';
export type { MemorySinkOptions } from './sinks/memorySink.js';
export { JsonlSink } from './sinks/jsonlSink.js';
export type { JsonlSinkOptions } from './sinks/jsonlSink.js';
export { TelemetryBridgeSink } from './sinks/telemetryBridgeSink.js';
export type {
  TelemetryBridgeSinkOptions,
  TelemetryBridgeHandler,
} from './sinks/telemetryBridgeSink.js';

export { LoggerProvider, useLogger, LoggerContext } from './react/LoggerContext.js';
export type { LoggerProviderProps, LoggerContextValue } from './react/LoggerContext.js';

export { LoggerError, LoggerConfigError, LoggerWriteError } from './errors.js';
