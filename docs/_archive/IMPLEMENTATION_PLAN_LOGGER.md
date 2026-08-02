# Implementation Plan: `@open-edu/logger`

> **Target audience:** AI coding agent running DeepSeek-4-Flash.
> **Order:** Execute top-to-bottom. Every Phase 1 file must compile and pass tests before starting Phase 2.

---

## Phase 0 — Setup Scaffold

### Step 0.1 — Create `packages/logger/` directory

```bash
mkdir -p packages/logger/src/sinks
mkdir -p packages/logger/src/react
```

### Step 0.2 — Create `packages/logger/package.json`

File: `packages/logger/package.json`

```json
{
  "name": "@open-edu/logger",
  "version": "0.1.0",
  "private": true,
  "description": "Structured isomorphic logging engine for Open-Edu",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint 'src/**/*.{ts,tsx}'",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@open-edu/telemetry": "workspace:*",
    "react": "^18.0.0",
    "@types/react": "^18.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "peerDependenciesMeta": {
    "react": {
      "optional": true
    }
  },
  "type": "module"
}
```

**Key points:**

- Zero production dependencies (the implementation plan says "zero-dependency or minimal dependency")
- `@open-edu/telemetry` is a **devDependency** because `TelemetryBridgeSink` imports it as an optional integration — it uses dynamic import or conditional registration so the core logger has no hard telemetry dependency
- React is an **optional peerDependency** — core logger works without it; only `LoggerProvider`/`useLogger` need React

### Step 0.3 — Create `packages/logger/tsconfig.json`

File: `packages/logger/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

**Note:** Include `DOM` lib because this is an isomorphic package (browser console support). Include `jsx: react-jsx` for the React context/hook.

---

## Phase 1 — Core Package Implementation

### Step 1.1 — `src/types.ts`

This is the single source of truth for all logger types. Every other file imports from here.

File: `packages/logger/src/types.ts`

```typescript
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
```

### Step 1.2 — `src/version.ts`

File: `packages/logger/src/version.ts`

```typescript
export const LOGGER_VERSION = '0.1.0';
```

### Step 1.3 — `src/errors.ts`

File: `packages/logger/src/errors.ts`

```typescript
export class LoggerError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'LoggerError';
    this.code = code;
  }
}

export class LoggerConfigError extends LoggerError {
  constructor(message: string) {
    super('LOGGER_CONFIG_ERROR', message);
    this.name = 'LoggerConfigError';
  }
}

export class LoggerWriteError extends LoggerError {
  constructor(message: string) {
    super('LOGGER_WRITE_ERROR', message);
    this.name = 'LoggerWriteError';
  }
}
```

### Step 1.4 — `src/logger.ts`

This is the core `Logger` class.

File: `packages/logger/src/logger.ts`

```typescript
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
import { LoggerConfigError } from './errors.js';

export { type ILogger };

let GLOBAL_MIN_LEVEL: LogLevel = 'debug';
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
  readonly #minLevel: LogLevel;
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

    const resolvedLevel = deriveLogLevel(options.minLevel, envLevel);
    const globalCfg = getGlobalConfig();
    this.#minLevel = resolvedLevel ?? globalCfg.minLevel;
    this.#sinks = resolveSinks(options.sinks);
  }

  child(options: ChildLoggerOptions = {}): Logger {
    const childScope = options.scope ? `${this.scope}:${options.scope}` : this.scope;
    return new Logger({
      scope: childScope,
      minLevel: this.#minLevel,
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
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.#minLevel]) return;

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
      error: serializedError,
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
```

### Step 1.5 — `src/sinks/consoleSink.ts`

Isomorphic console sink with ANSI colorization for Node and CSS styling for browser.

File: `packages/logger/src/sinks/consoleSink.ts`

```typescript
import type { LogSink, LogEntry, LogLevel } from '../types.js';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BOLD_RED = '\x1b[1;31m';

const LEVEL_COLORS_NODE: Record<LogLevel, string> = {
  debug: DIM,
  info: GREEN,
  warn: YELLOW,
  error: RED,
};

const LEVEL_COLORS_BROWSER: Record<LogLevel, string> = {
  debug: 'color: #888',
  info: 'color: #22c55e',
  warn: 'color: #eab308',
  error: 'color: #ef4444; font-weight: bold',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function formatTimestampNode(ts: string): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${GRAY}${hh}:${mm}:${ss}${RESET}`;
}

function formatLevelNode(level: LogLevel): string {
  const color = LEVEL_COLORS_NODE[level];
  const label = level.toUpperCase().padEnd(5);
  return `${color}${label}${RESET}`;
}

function formatScopeNode(scope: string): string {
  return `${CYAN}[${scope}]${RESET}`;
}

function formatMessageNode(entry: LogEntry): string {
  const parts: string[] = [];
  parts.push(formatTimestampNode(entry.timestamp));
  parts.push(formatLevelNode(entry.level));
  parts.push(formatScopeNode(entry.scope));
  parts.push(entry.message);

  if (entry.correlationId) {
    parts.push(`${DIM}[cid:${entry.correlationId.substring(0, 8)}]${RESET}`);
  }

  return parts.join(' ');
}

function formatMessageBrowser(entry: LogEntry): [string, string] {
  const color = LEVEL_COLORS_BROWSER[entry.level];
  const ts = new Date(entry.timestamp).toLocaleTimeString();
  const prefix = `%c[${ts}] [${entry.scope}]`;
  return [prefix, color];
}

export class ConsoleSink implements LogSink {
  write(entry: LogEntry): void {
    if (isBrowser()) {
      this.#writeBrowser(entry);
    } else {
      this.#writeNode(entry);
    }
  }

  #writeNode(entry: LogEntry): void {
    const formatted = formatMessageNode(entry);

    switch (entry.level) {
      case 'error':
        console.error(formatted);
        if (entry.error?.stack) {
          console.error(`  ${DIM}${entry.error.stack.split('\n').join(`\n  `)}${RESET}`);
        }
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      const ctxStr = JSON.stringify(entry.context, null, 2);
      console.log(`  ${DIM}${ctxStr.split('\n').join(`\n  `)}${RESET}`);
    }
  }

  #writeBrowser(entry: LogEntry): void {
    const [prefix, color] = formatMessageBrowser(entry);
    const logFn = this.#browserLogFn(entry.level);

    logFn(prefix, color, entry.message, entry.context ?? '');

    if (entry.error?.stack) {
      logFn(`  ${entry.error.name}: ${entry.error.message}`);
      console.debug(entry.error.stack);
    }
  }

  #browserLogFn(level: LogLevel): typeof console.log {
    switch (level) {
      case 'error':
        return console.error.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'debug':
        return console.debug.bind(console);
      default:
        return console.log.bind(console);
    }
  }
}
```

### Step 1.6 — `src/sinks/memorySink.ts`

Circular buffer that retains the last N entries for in-app inspection.

File: `packages/logger/src/sinks/memorySink.ts`

```typescript
import type { LogSink, LogEntry } from '../types.js';

export interface MemorySinkOptions {
  capacity?: number;
}

export class MemorySink implements LogSink {
  readonly #capacity: number;
  readonly #buffer: LogEntry[];
  #writeIndex: number = 0;
  #totalWritten: number = 0;

  constructor(options: MemorySinkOptions = {}) {
    this.#capacity = options.capacity ?? 500;
    this.#buffer = new Array(this.#capacity);
  }

  write(entry: LogEntry): void {
    this.#buffer[this.#writeIndex] = entry;
    this.#writeIndex = (this.#writeIndex + 1) % this.#capacity;
    this.#totalWritten++;
  }

  entries(): LogEntry[] {
    if (this.#totalWritten === 0) return [];

    if (this.#totalWritten < this.#capacity) {
      return this.#buffer.slice(0, this.#totalWritten).filter(Boolean);
    }

    const result: LogEntry[] = [];
    for (let i = 0; i < this.#capacity; i++) {
      const idx = (this.#writeIndex + i) % this.#capacity;
      const entry = this.#buffer[idx];
      if (entry) result.push(entry);
    }
    return result;
  }

  entriesByLevel(level: string): LogEntry[] {
    return this.entries().filter((e) => e.level === level);
  }

  entriesByScope(prefix: string): LogEntry[] {
    return this.entries().filter((e) => e.scope.startsWith(prefix));
  }

  recent(count: number): LogEntry[] {
    const all = this.entries();
    return all.slice(-count);
  }

  clear(): void {
    this.#buffer.length = 0;
    this.#buffer.length = this.#capacity;
    this.#writeIndex = 0;
    this.#totalWritten = 0;
  }

  get count(): number {
    return Math.min(this.#totalWritten, this.#capacity);
  }

  get totalWritten(): number {
    return this.#totalWritten;
  }
}
```

### Step 1.7 — `src/sinks/jsonlSink.ts`

Writes line-delimited JSON to a file for Node.js environments.

File: `packages/logger/src/sinks/jsonlSink.ts`

```typescript
import { appendFile } from 'node:fs/promises';
import type { LogSink, LogEntry } from '../types.js';
import { LoggerWriteError } from '../errors.js';

export interface JsonlSinkOptions {
  filePath: string;
  flushIntervalMs?: number;
}

export class JsonlSink implements LogSink {
  readonly #filePath: string;
  readonly #buffer: string[] = [];
  readonly #flushIntervalMs: number;
  #timer: ReturnType<typeof setInterval> | null = null;
  #closed = false;

  constructor(options: JsonlSinkOptions) {
    this.#filePath = options.filePath;
    this.#flushIntervalMs = options.flushIntervalMs ?? 5000;

    this.#timer = setInterval(() => {
      void this.flush();
    }, this.#flushIntervalMs);

    if (this.#timer && typeof this.#timer === 'object' && 'unref' in this.#timer) {
      this.#timer.unref();
    }
  }

  write(entry: LogEntry): void {
    if (this.#closed) return;
    this.#buffer.push(JSON.stringify(entry));
  }

  async flush(): Promise<void> {
    if (this.#buffer.length === 0) return;
    const lines = this.#buffer.splice(0).join('\n') + '\n';
    try {
      await appendFile(this.#filePath, lines);
    } catch (err) {
      throw new LoggerWriteError(`Failed to write log to ${this.#filePath}: ${String(err)}`);
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    await this.flush();
  }
}
```

### Step 1.8 — `src/sinks/telemetryBridgeSink.ts`

Forwards `warn`/`error` logs to `@open-edu/telemetry` when available. Uses a callback pattern to avoid hard dependency.

File: `packages/logger/src/sinks/telemetryBridgeSink.ts`

```typescript
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
```

### Step 1.9 — `src/react/LoggerContext.tsx`

React context provider and hook.

File: `packages/logger/src/react/LoggerContext.tsx`

```typescript
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Logger, type ILogger } from '../logger.js';
import type { LogSink, LogLevel } from '../types.js';

export interface LoggerContextValue {
  logger: Logger;
  getLogger: (scope: string) => Logger;
}

export interface LoggerProviderProps {
  sinks?: LogSink[];
  minLevel?: LogLevel;
  children: ReactNode;
}

const LoggerContext = createContext<LoggerContextValue | null>(null);

const SHARED_ROOT = new Logger({ scope: 'open-edu' });
const DEFAULT_VALUE: LoggerContextValue = {
  logger: SHARED_ROOT,
  getLogger: (scope: string) => new Logger({ scope }),
};

export function LoggerProvider({
  sinks,
  minLevel,
  children,
}: LoggerProviderProps): JSX.Element {
  const value = useMemo<LoggerContextValue>(() => {
    const logger = new Logger({ scope: 'open-edu', sinks, minLevel });
    return {
      logger,
      getLogger: (scope: string) => logger.child({ scope }),
    };
  }, [sinks, minLevel]);

  return (
    <LoggerContext.Provider value={value}>
      {children}
    </LoggerContext.Provider>
  );
}

export function useLogger(scope?: string): ILogger {
  const ctx = useContext(LoggerContext);
  if (!ctx) {
    if (scope) {
      return new Logger({ scope });
    }
    return SHARED_ROOT;
  }
  if (scope) {
    return ctx.getLogger(scope);
  }
  return ctx.logger;
}

export { LoggerContext };
```

### Step 1.10 — `src/index.ts`

Barrel export.

File: `packages/logger/src/index.ts`

```typescript
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
```

---

## Phase 1 — Tests

Every source file gets a paired `.test.ts` in the same directory.

### Step 1.11 — `src/logger.test.ts`

File: `packages/logger/src/logger.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger, createLogger, configureLogger, defaultLogger } from './logger.js';
import type { LogSink, LogEntry } from './types.js';
import { ConsoleSink } from './sinks/consoleSink.js';

function createMockSink(): { sink: LogSink; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  return {
    entries,
    sink: {
      write(entry: LogEntry) {
        entries.push(entry);
      },
    },
  };
}

describe('Logger', () => {
  beforeEach(() => {
    configureLogger({ minLevel: 'debug', sinks: [new ConsoleSink()] });
  });

  describe('level filtering', () => {
    it('emits at or above minLevel', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'test', minLevel: 'warn', sinks: [sink] });

      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(entries.length).toBe(2);
      expect(entries[0]!.level).toBe('warn');
      expect(entries[1]!.level).toBe('error');
    });

    it('emits all when minLevel is debug', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'test', minLevel: 'debug', sinks: [sink] });

      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');

      expect(entries.length).toBe(4);
    });
  });

  describe('scope', () => {
    it('sets scope on log entries', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'my-scope', sinks: [sink] });
      logger.info('hello');
      expect(entries[0]!.scope).toBe('my-scope');
    });
  });

  describe('child loggers', () => {
    it('inherits and appends scope', () => {
      const { sink, entries } = createMockSink();
      const parent = new Logger({ scope: 'parent', sinks: [sink] });
      const child = parent.child({ scope: 'child' });
      child.info('from child');
      expect(entries[0]!.scope).toBe('parent:child');
    });

    it('inherits correlationId', () => {
      const { sink, entries } = createMockSink();
      const parent = new Logger({ scope: 'parent', sinks: [sink], correlationId: 'cid-123' });
      const child = parent.child();
      child.info('msg');
      expect(entries[0]!.correlationId).toBe('cid-123');
    });

    it('overrides correlationId if provided', () => {
      const { sink, entries } = createMockSink();
      const parent = new Logger({ scope: 'parent', sinks: [sink], correlationId: 'cid-1' });
      const child = parent.child({ correlationId: 'cid-2' });
      child.info('msg');
      expect(entries[0]!.correlationId).toBe('cid-2');
    });

    it('merges context from parent and child', () => {
      const { sink, entries } = createMockSink();
      const parent = new Logger({ scope: 'parent', sinks: [sink], context: { a: 1 } });
      const child = parent.child({ context: { b: 2 } });
      child.info('msg');
      expect(entries[0]!.context).toEqual({ a: 1, b: 2 });
    });
  });

  describe('timing', () => {
    it('time and timeEnd logs duration', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'timer', sinks: [sink] });
      logger.time('bench');
      logger.timeEnd('bench');
      const timeEntry = entries.find((e) => e.level === 'info');
      expect(timeEntry).toBeDefined();
      expect(timeEntry!.message).toContain('bench took');
      expect(timeEntry!.context).toHaveProperty('durationMs');
    });

    it('timeEnd without time warns', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'timer', sinks: [sink] });
      logger.timeEnd('nonexistent');
      const warnEntry = entries.find((e) => e.level === 'warn');
      expect(warnEntry).toBeDefined();
      expect(warnEntry!.message).toContain('Timer not started');
    });
  });

  describe('error serialization', () => {
    it('serializes Error objects', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'err', sinks: [sink] });
      const err = new Error('boom');
      logger.error('failed', err);
      expect(entries[0]!.error).toEqual({
        name: 'Error',
        message: 'boom',
        stack: err.stack,
      });
    });

    it('serializes non-Error throws', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'err', sinks: [sink] });
      logger.error('failed', 'string error');
      expect(entries[0]!.error).toEqual({
        name: 'UnknownError',
        message: 'string error',
      });
    });
  });

  describe('entry structure', () => {
    it('has all required fields', () => {
      const { sink, entries } = createMockSink();
      const logger = new Logger({ scope: 'test', sinks: [sink] });
      logger.info('hello', { key: 'value' });

      const entry = entries[0]!;
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('level', 'info');
      expect(entry).toHaveProperty('scope', 'test');
      expect(entry).toHaveProperty('message', 'hello');
      expect(entry).toHaveProperty('context.key', 'value');
      expect(entry).not.toHaveProperty('error');
    });
  });

  describe('createLogger', () => {
    it('creates a logger with given scope', () => {
      const logger = createLogger({ scope: 'factory' });
      expect(logger.scope).toBe('factory');
    });
  });

  describe('defaultLogger', () => {
    it('returns singleton with scope open-edu', () => {
      const d = defaultLogger();
      expect(d.scope).toBe('open-edu');
    });
  });

  describe('sink failure isolation', () => {
    it('does not throw when a sink throws', () => {
      const badSink: LogSink = {
        write: () => {
          throw new Error('sink exploded');
        },
      };
      const logger = new Logger({ scope: 'test', sinks: [badSink] });
      expect(() => logger.info('hello')).not.toThrow();
    });
  });

  describe('configureLogger', () => {
    it('updates global minLevel and sinks', () => {
      const { sink, entries } = createMockSink();
      configureLogger({ minLevel: 'error', sinks: [sink] });

      const logger = new Logger({ scope: 'config-test' });
      logger.warn('should not appear');
      logger.error('should appear');

      const errorEntry = entries[0];
      expect(errorEntry).toBeDefined();
      expect(errorEntry!.level).toBe('error');
    });
  });
});
```

### Step 1.12 — `src/sinks/memorySink.test.ts`

File: `packages/logger/src/sinks/memorySink.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { MemorySink } from './memorySink.js';
import type { LogEntry } from '../types.js';

function makeEntry(level: string, scope: string, message: string): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: level as LogEntry['level'],
    scope,
    message,
  };
}

describe('MemorySink', () => {
  it('stores entries and retrieves them', () => {
    const sink = new MemorySink({ capacity: 10 });
    sink.write(makeEntry('info', 'test', 'hello'));
    sink.write(makeEntry('warn', 'test', 'world'));

    expect(sink.entries()).toHaveLength(2);
    expect(sink.count).toBe(2);
    expect(sink.totalWritten).toBe(2);
  });

  it('respects capacity with circular overwrite', () => {
    const sink = new MemorySink({ capacity: 3 });
    for (let i = 0; i < 10; i++) {
      sink.write(makeEntry('info', 'test', `msg-${i}`));
    }

    expect(sink.entries()).toHaveLength(3);
    expect(sink.count).toBe(3);
    expect(sink.totalWritten).toBe(10);

    const entries = sink.entries();
    expect(entries[0]!.message).toBe('msg-7');
    expect(entries[1]!.message).toBe('msg-8');
    expect(entries[2]!.message).toBe('msg-9');
  });

  it('filters by level', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 't', 'a'));
    sink.write(makeEntry('warn', 't', 'b'));
    sink.write(makeEntry('error', 't', 'c'));
    sink.write(makeEntry('info', 't', 'd'));

    const errors = sink.entriesByLevel('error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toBe('c');
  });

  it('filters by scope prefix', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 'core:loader', 'a'));
    sink.write(makeEntry('info', 'core:validator', 'b'));
    sink.write(makeEntry('info', 'pipeline:extract', 'c'));

    const coreEntries = sink.entriesByScope('core');
    expect(coreEntries).toHaveLength(2);
  });

  it('returns recent entries', () => {
    const sink = new MemorySink({ capacity: 100 });
    for (let i = 0; i < 10; i++) {
      sink.write(makeEntry('info', 'test', `msg-${i}`));
    }

    const recent = sink.recent(3);
    expect(recent).toHaveLength(3);
    expect(recent[0]!.message).toBe('msg-7');
    expect(recent[2]!.message).toBe('msg-9');
  });

  it('clear resets all state', () => {
    const sink = new MemorySink();
    sink.write(makeEntry('info', 'test', 'hello'));
    sink.clear();

    expect(sink.entries()).toHaveLength(0);
    expect(sink.count).toBe(0);
    expect(sink.totalWritten).toBe(0);
  });
});
```

### Step 1.13 — `src/sinks/consoleSink.test.ts`

File: `packages/logger/src/sinks/consoleSink.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConsoleSink } from './consoleSink.js';
import type { LogEntry } from '../types.js';

describe('ConsoleSink', () => {
  let originalLog: typeof console.log;
  let originalError: typeof console.error;
  let originalWarn: typeof console.warn;
  let originalDebug: typeof console.debug;

  beforeEach(() => {
    originalLog = console.log;
    originalError = console.error;
    originalWarn = console.warn;
    originalDebug = console.debug;
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.debug = vi.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.debug = originalDebug;
  });

  const makeEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
    timestamp: new Date().toISOString(),
    level: 'info' as const,
    scope: 'test',
    message: 'test message',
    ...overrides,
  });

  it('calls console.log for info', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'info' }));
    expect(console.log).toHaveBeenCalled();
  });

  it('calls console.error for error', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'error' }));
    expect(console.error).toHaveBeenCalled();
  });

  it('calls console.warn for warn', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'warn' }));
    expect(console.warn).toHaveBeenCalled();
  });

  it('calls console.debug for debug', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ level: 'debug' }));
    expect(console.debug).toHaveBeenCalled();
  });

  it('includes scope in output', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ scope: 'my-module' }));
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toContain('my-module');
  });

  it('includes message in output', () => {
    const sink = new ConsoleSink();
    sink.write(makeEntry({ message: 'hello world' }));
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(call).toContain('hello world');
  });
});
```

### Step 1.14 — `src/sinks/jsonlSink.test.ts`

File: `packages/logger/src/sinks/jsonlSink.test.ts`

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { unlink, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonlSink } from './jsonlSink.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    scope: 'test',
    message: 'hello',
    ...overrides,
  };
}

describe('JsonlSink', () => {
  const filePath = join(tmpdir(), `oe-logger-test-${Date.now()}.jsonl`);

  afterEach(async () => {
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  });

  it('writes entries as JSONL', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 50 });

    sink.write(makeEntry({ message: 'first' }));
    sink.write(makeEntry({ message: 'second' }));

    await sink.close();

    const content = await readFile(filePath, 'utf-8');
    const lines = content.trim().split('\n');

    expect(lines.length).toBe(2);
    const first = JSON.parse(lines[0]!);
    expect(first.message).toBe('first');
    const second = JSON.parse(lines[1]!);
    expect(second.message).toBe('second');
  });

  it('flushes periodically', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 10 });

    sink.write(makeEntry({ message: 'auto-flush' }));

    await new Promise((resolve) => setTimeout(resolve, 100));

    const content = await readFile(filePath, 'utf-8');
    expect(content.trim()).toBeTruthy();

    await sink.close();
  });

  it('does not write after close', async () => {
    const sink = new JsonlSink({ filePath, flushIntervalMs: 100 });

    await sink.close();
    sink.write(makeEntry({ message: 'after-close' }));

    const exists = existsSync(filePath);
    if (exists) {
      const content = await readFile(filePath, 'utf-8');
      expect(content.trim()).toBe('');
    }
  });
});
```

### Step 1.15 — `src/sinks/telemetryBridgeSink.test.ts`

File: `packages/logger/src/sinks/telemetryBridgeSink.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TelemetryBridgeSink } from './telemetryBridgeSink.js';
import type { LogEntry } from '../types.js';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'warn',
    scope: 'test',
    message: 'test',
    ...overrides,
  };
}

describe('TelemetryBridgeSink', () => {
  it('forwards warn entries to handler', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'warn' }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
  });

  it('forwards error entries to handler', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'error' }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not forward info/debug entries by default', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler });

    sink.write(makeEntry({ level: 'info' }));
    sink.write(makeEntry({ level: 'debug' }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('respects custom levels filter', () => {
    const handler = vi.fn();
    const sink = new TelemetryBridgeSink({ onDiagnostic: handler, levels: ['error'] });

    sink.write(makeEntry({ level: 'warn' }));
    sink.write(makeEntry({ level: 'error' }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });
});
```

### Step 1.16 — `src/react/LoggerContext.test.tsx`

File: `packages/logger/src/react/LoggerContext.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { LoggerProvider, useLogger } from './LoggerContext.js';
import type { LogSink, LogEntry } from '../types.js';
import { MemorySink } from '../sinks/memorySink.js';

function createWrapper(sinks?: LogSink[]) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(LoggerProvider, { sinks }, children);
  };
}

describe('LoggerProvider', () => {
  it('provides a logger via useLogger', () => {
    const { result } = renderHook(() => useLogger(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
    expect(typeof result.current.info).toBe('function');
  });

  it('useLogger(scope) returns a child logger with the correct scope', () => {
    const memory = new MemorySink();
    const { result } = renderHook(() => useLogger('my-component'), {
      wrapper: createWrapper([memory]),
    });

    result.current.info('hello');
    const entries = memory.entries();
    expect(entries[0]!.scope).toBe('open-edu:my-component');
  });

  it('useLogger returns default global logger outside provider', () => {
    const { result } = renderHook(() => useLogger());

    expect(result.current).toBeDefined();
  });

  it('useLogger(scope) outside provider creates new logger per scope', () => {
    const { result } = renderHook(() => useLogger('standalone'));

    expect(result.current).toBeDefined();
    expect(typeof result.current.info).toBe('function');
  });
});
```

### Step 1.17 — `src/errors.test.ts`

File: `packages/logger/src/errors.test.ts`

```typescript
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
```

### Step 1.18 — `src/types.test.ts`

File: `packages/logger/src/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { LOG_LEVELS, LOG_LEVEL_VALUES } from './types.js';

describe('LOG_LEVELS', () => {
  it('contains debug, info, warn, error', () => {
    expect(LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error']);
  });
});

describe('LOG_LEVEL_VALUES', () => {
  it('debug < info < warn < error', () => {
    expect(LOG_LEVEL_VALUES.debug).toBeLessThan(LOG_LEVEL_VALUES.info);
    expect(LOG_LEVEL_VALUES.info).toBeLessThan(LOG_LEVEL_VALUES.warn);
    expect(LOG_LEVEL_VALUES.warn).toBeLessThan(LOG_LEVEL_VALUES.error);
  });
});
```

### Step 1.19 — `src/version.test.ts`

File: `packages/logger/src/version.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { LOGGER_VERSION } from './version.js';

describe('LOGGER_VERSION', () => {
  it('is 0.1.0', () => {
    expect(LOGGER_VERSION).toBe('0.1.0');
  });
});
```

### Step 1.20 — `src/index.test.ts`

File: `packages/logger/src/index.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  Logger,
  createLogger,
  defaultLogger,
  configureLogger,
  ConsoleSink,
  MemorySink,
  JsonlSink,
  TelemetryBridgeSink,
  LoggerProvider,
  useLogger,
  LOGGER_VERSION,
  LOG_LEVELS,
} from './index.js';

describe('index barrel exports', () => {
  it('exports Logger class', () => {
    expect(Logger).toBeDefined();
    expect(typeof Logger).toBe('function');
  });

  it('exports createLogger factory', () => {
    expect(typeof createLogger).toBe('function');
  });

  it('exports defaultLogger', () => {
    expect(typeof defaultLogger).toBe('function');
  });

  it('exports configureLogger', () => {
    expect(typeof configureLogger).toBe('function');
  });

  it('exports ConsoleSink', () => {
    expect(ConsoleSink).toBeDefined();
  });

  it('exports MemorySink', () => {
    expect(MemorySink).toBeDefined();
  });

  it('exports JsonlSink', () => {
    expect(JsonlSink).toBeDefined();
  });

  it('exports TelemetryBridgeSink', () => {
    expect(TelemetryBridgeSink).toBeDefined();
  });

  it('exports LoggerProvider', () => {
    expect(LoggerProvider).toBeDefined();
  });

  it('exports useLogger', () => {
    expect(typeof useLogger).toBe('function');
  });

  it('exports LOGGER_VERSION', () => {
    expect(LOGGER_VERSION).toBe('0.1.0');
  });

  it('exports LOG_LEVELS', () => {
    expect(LOG_LEVELS).toEqual(['debug', 'info', 'warn', 'error']);
  });
});
```

---

## Phase 1 — Build & Verify

### Step 1.21 — Install, build, test

Run these commands in order. Each must pass before moving to Phase 2.

```bash
pnpm install
pnpm --filter @open-edu/logger build
pnpm --filter @open-edu/logger test
pnpm --filter @open-edu/logger typecheck
pnpm --filter @open-edu/logger lint
```

---

## Phase 2 — Package Integration

Integrate `@open-edu/logger` into consuming packages. Do integrations in the order listed below.

---

### Step 2.1 — Integrate into `packages/core`

#### 2.1.1 — Update `packages/core/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.1.2 — Add logger module in `packages/core/src/`

Create file: `packages/core/src/logger.ts`

```typescript
import { createLogger } from '@open-edu/logger';

export const coreLoaderLogger = createLogger({ scope: 'core:loader' });
export const coreValidatorLogger = createLogger({ scope: 'core:validator' });
export const coreCatalogLogger = createLogger({ scope: 'core:catalog' });
export const coreScannerLogger = createLogger({ scope: 'core:scanner' });
export const corePatcherLogger = createLogger({ scope: 'core:patcher' });
```

#### 2.1.3 — Use the loggers in core modules

In `packages/core/src/loader.ts` (and equivalent files), add logging at key points:

- **loader.ts**: Log when loading starts (`coreLoaderLogger.info('Loading package...', { rootDir })`), when complete, and on errors.
- **validator.ts**: Log validation start, success, and failures (`coreValidatorLogger.warn(...)`, `coreValidatorLogger.error(...)`).
- **catalog.ts**: Log catalog operations.
- **scanner.ts**: Log scan operations.
- **patcher.ts**: Log patch operations.

Use the search in `packages/core/src/` to find all functions that do file I/O or throw. Add `logger.time('operation')` / `logger.timeEnd('operation')` pairs for I/O operations.

#### 2.1.4 — Export from core's index

In `packages/core/src/index.ts`, add:

```typescript
export {
  coreLoaderLogger,
  coreValidatorLogger,
  coreCatalogLogger,
  coreScannerLogger,
  corePatcherLogger,
} from './logger.js';
```

---

### Step 2.2 — Integrate into `packages/workflow`

#### 2.2.1 — Update `packages/workflow/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.2.2 — Add logging in `packages/workflow/src/engine.ts`

Import logger:

```typescript
import { createLogger } from '@open-edu/logger';
const workflowLogger = createLogger({ scope: 'workflow:engine' });
```

Add log statements at:

- Workflow engine initialization
- State transitions (after each transition, log `info` with transition name)
- Rule evaluation failures (`warn`)
- Step evaluations (`debug`)

#### 2.2.3 — Add logging in error paths

In `engine.ts`, find all `throw` statements. Before throwing, call `workflowLogger.error('descriptive message', error)`.

---

### Step 2.3 — Integrate into `packages/ai-companion`

#### 2.3.1 — Update `packages/ai-companion/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.3.2 — Find the AI companion service file

Search for the main service/engine file in `packages/ai-companion/src/`.

Create logging for:

- Scope: `pipili:service`
- Log: prompt formatting start/finish with `time`/`timeEnd`
- Log: model streaming start/finish with duration
- Log: token usage metrics
- Log: fallback handler invocation (`warn`)
- Log: errors in model calls (`error`)

---

### Step 2.4 — Integrate into `packages/oep-distribution`

#### 2.4.1 — Update `packages/oep-distribution/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.4.2 — Add logging in key files

In `packages/oep-distribution/src/oep-writer.ts`:

- Scope: `oep:writer`
- Log: archive building start/finish with `time`/`timeEnd`
- Log: files added to archive (`debug`)
- Log: any errors (`error`)

In `packages/oep-distribution/src/oep-reader.ts`:

- Scope: `oep:reader`
- Log: unzipping start/finish
- Log: SHA-256 verification (`info` if pass, `warn` if mismatch)
- Log: catalog synchronization

In `packages/oep-distribution/src/catalog-loader.ts`:

- Scope: `oep:catalog`
- Log: catalog load and sync operations

---

### Step 2.5 — Integrate into `packages/pipeline`

#### 2.5.1 — Update `packages/pipeline/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.5.2 — Update `packages/pipeline/src/extraction/logger.ts`

This is the existing `ExtractionLogger`. Modify it to wrap `@open-edu/logger` while keeping the same public API.

**New implementation:**

```typescript
import { createLogger, type ILogger } from '@open-edu/logger';

export interface ExtractionLogEntry {
  stage: 'extraction';
  extractor: string;
  file: string;
  durationMs: number;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export type ExtractionLoggerOutput = 'console' | 'json';

export class ExtractionLogger {
  private entries: ExtractionLogEntry[] = [];
  private output: ExtractionLoggerOutput;
  private verbose: boolean;
  private logger: ILogger;

  constructor(output: ExtractionLoggerOutput = 'console', verbose = false) {
    this.output = output;
    this.verbose = verbose;
    this.logger = createLogger({ scope: 'pipeline:extraction' });
  }

  info(extractor: string, file: string, durationMs: number, message: string): void {
    this.logger.info(`[extraction:${extractor}] ${file} (${durationMs}ms) — ${message}`);
    this.log('info', extractor, file, durationMs, message);
  }

  warn(extractor: string, file: string, durationMs: number, message: string): void {
    this.logger.warn(`[extraction:${extractor}] ${file} (${durationMs}ms) — ${message}`);
    this.log('warn', extractor, file, durationMs, message);
  }

  error(extractor: string, file: string, durationMs: number, message: string): void {
    this.logger.error(`[extraction:${extractor}] ${file} (${durationMs}ms) — ${message}`);
    this.log('error', extractor, file, durationMs, message);
  }

  getEntries(): ExtractionLogEntry[] {
    return [...this.entries];
  }

  private log(
    level: ExtractionLogEntry['level'],
    extractor: string,
    file: string,
    durationMs: number,
    message: string,
  ): void {
    const entry: ExtractionLogEntry = {
      stage: 'extraction',
      extractor,
      file,
      durationMs,
      level,
      message,
    };
    this.entries.push(entry);

    if (this.output === 'json' || this.verbose) {
      const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
      console.log(
        `${prefix} [extraction:${extractor}] ${file} (${durationMs}ms) \u2014 ${message}`,
      );
    }
  }
}
```

**Key change:** The `ExtractionLogger` now delegates to `@open-edu/logger` under scope `pipeline:extraction`, while preserving the in-memory entries array and dual output modes (console/json).

#### 2.5.3 — Update `packages/pipeline/src/cli/logger.ts`

Wrap the existing CLI color-logging utilities to delegate to `@open-edu/logger` where possible. The existing format (ANSI colored output) should be preserved.

**New implementation:**

```typescript
import { createLogger } from '@open-edu/logger';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

const cliLogger = createLogger({ scope: 'pipeline:cli' });

export function info(msg: string): void {
  cliLogger.info(msg);
  console.log(msg);
}

export function success(msg: string): void {
  cliLogger.info(msg);
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg: string): void {
  cliLogger.warn(msg);
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg: string): void {
  cliLogger.error(msg);
  console.error(`${RED}✗${RESET} ${msg}`);
}

export function verbose(msg: string, isVerbose: boolean): void {
  if (isVerbose) {
    cliLogger.debug(msg);
    console.log(`${DIM}${msg}${RESET}`);
  }
}

export function header(title: string): void {
  cliLogger.info(title);
  console.log(`\n${BOLD}${CYAN}${title}${RESET}`);
}

export function divider(): void {
  console.log('='.repeat(50));
}

export function reportTable(
  metrics: { label: string; value: string | number; status: string }[],
): void {
  const labelPad = Math.max(...metrics.map((m) => m.label.length));
  const valuePad = Math.max(...metrics.map((m) => String(m.value).length));

  const width = Math.max(0, labelPad + valuePad + 12);
  console.log(`\n${'─'.repeat(width)}`);
  console.log(
    `${BOLD}${' '.repeat(2)}Metric${' '.repeat(Math.max(0, labelPad - 6))}${' '.repeat(2)}Count${' '.repeat(Math.max(0, valuePad - 5))}Status${RESET}`,
  );
  console.log(`${'─'.repeat(width)}`);

  for (const m of metrics) {
    const statusIcon =
      m.status === 'ok'
        ? `${GREEN}✅${RESET}`
        : m.status === 'warn'
          ? `${YELLOW}ℹ️${RESET}`
          : `${RED}❌${RESET}`;
    console.log(
      `  ${m.label.padEnd(labelPad)}  ${String(m.value).padEnd(valuePad)}  ${statusIcon}`,
    );
  }

  console.log(`${'─'.repeat(width)}\n`);

  cliLogger.info('pipeline report', { metrics });
}
```

---

### Step 2.6 — Integrate into `packages/cli`

#### 2.6.1 — Update `packages/cli/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.6.2 — Add `--verbose`/`--quiet` flag and structured logging

In `packages/cli/src/cli.ts`, add a global option:

```typescript
program.option('--verbose', 'Enable verbose diagnostic logging');
program.option('--quiet', 'Suppress all non-error output');
```

In the main action handler (before dispatching to commands), configure the logger:

```typescript
import { configureLogger } from '@open-edu/logger';

if (options.verbose) {
  configureLogger({ minLevel: 'debug' });
} else if (options.quiet) {
  configureLogger({ minLevel: 'error' });
}
```

#### 2.6.3 — Add scoped logging to CLI commands

In each command file under `packages/cli/src/commands/`, add:

```typescript
import { createLogger } from '@open-edu/logger';
const logger = createLogger({ scope: 'cli:command-name' });
```

Log at key points in each command handler (start, completion, errors).

---

### Step 2.7 — Integrate into `apps/learner`

#### 2.7.1 — Update `apps/learner/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.7.2 — Add `LoggerProvider` wrapper

In `apps/learner/src/AppShell.tsx`, add `LoggerProvider` to the provider nesting. The provider chain is currently:

```
CompanionProvider > PipiliChatProvider > RuntimeThemeProvider > I18nProvider > FontSizeProvider > AppShellInner
```

Wrap with `LoggerProvider` after `I18nProvider` (to keep it high enough to log all components):

```typescript
import { LoggerProvider, MemorySink } from '@open-edu/logger';
```

In the `AppShell` function, add `LoggerProvider`:

Find the provider nesting block:

```typescript
<CompanionProvider>
  <PipiliChatProvider>
    <RuntimeThemeProvider themeId={themeId}>
      <I18nProvider ...>
        <FontSizeProvider>
          <AppShellInner ... />
        </FontSizeProvider>
      </I18nProvider>
    </RuntimeThemeProvider>
  </PipiliChatProvider>
</CompanionProvider>
```

Change to:

```typescript
import { useMemo } from 'react';
import { LoggerProvider, MemorySink } from '@open-edu/logger';

// Inside AppShell, before the return:
const loggerSinks = useMemo(() => {
  if (import.meta.env.DEV) {
    return [new MemorySink()];
  }
  return undefined;
}, []);

return (
  <CompanionProvider>
    <PipiliChatProvider>
      <RuntimeThemeProvider themeId={themeId}>
        <I18nProvider ...>
          <LoggerProvider sinks={loggerSinks}>
            <FontSizeProvider>
              <AppShellInner ... />
            </FontSizeProvider>
          </LoggerProvider>
        </I18nProvider>
      </RuntimeThemeProvider>
    </PipiliChatProvider>
  </CompanionProvider>
);
```

#### 2.7.3 — Add global error handlers

In `apps/learner/src/main.tsx`, add after `createRoot`:

```typescript
import { defaultLogger } from '@open-edu/logger';

const rootLogger = defaultLogger();

window.onerror = (message, source, lineno, colno, error) => {
  rootLogger.error('Unhandled runtime error', error ?? { message: String(message) }, {
    source,
    lineno,
    colno,
  });
};

window.addEventListener('unhandledrejection', (event) => {
  rootLogger.error('Unhandled promise rejection', event.reason);
});
```

---

### Step 2.8 — Integrate into `apps/dev-server`

#### 2.8.1 — Update `apps/dev-server/package.json`

Add to `dependencies`:

```json
"@open-edu/logger": "workspace:*"
```

Run: `pnpm install`

#### 2.8.2 — Add `LoggerProvider` wrapper

In `apps/dev-server/src/main.tsx`, add `LoggerProvider` with `MemorySink` to the provider chain:

```typescript
import { LoggerProvider, MemorySink } from '@open-edu/logger';
```

Add after `FontSizeProvider`:

```typescript
<LoggerProvider sinks={[new MemorySink()]}>
  <DevApp />
</LoggerProvider>
```

#### 2.8.3 — Add "Logs" tab to InspectorPanel

In `apps/dev-server/src/inspectors/InspectorPanel.tsx`:

1. Add `'logs'` to the `Tab` type:

```typescript
type Tab = 'telemetry' | 'logs' | 'accessibility' | 'rewards' | 'bundle';
```

2. Add the tab trigger (after the Telemetry tab, before A11y):

```typescript
<TabsTrigger
  value="logs"
  className="data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-surface flex-1 rounded-none border-0 border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
>
  Logs
</TabsTrigger>
```

3. Add the tab content:

```typescript
<TabsContent value="logs" className="mt-0 flex-1 overflow-auto border-0 p-2">
  <LogsInspector />
</TabsContent>
```

#### 2.8.4 — Create `apps/dev-server/src/inspectors/LogsInspector.tsx`

File: `apps/dev-server/src/inspectors/LogsInspector.tsx`

```typescript
import { useState, useSyncExternalStore } from 'react';
import { useLogger, MemorySink } from '@open-edu/logger';
import type { LogEntry, LogLevel } from '@open-edu/logger';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Access the shared MemorySink instance — since we created it in main.tsx
// and injected via LoggerProvider, we need to access it through the context
// or track it externally. For simplicity in the dev-server, we store a module-level
// reference when LoggerProvider initializes.

let _inspectorSink: MemorySink | null = null;

export function setInspectorSink(sink: MemorySink): void {
  _inspectorSink = sink;
}

export function getInspectorSink(): MemorySink | null {
  return _inspectorSink;
}

const LEVEL_BADGE: Record<LogLevel, string> = {
  debug: 'bg-transparent border-outline-variant text-on-surface-variant',
  info: 'bg-primary/10 border-primary/30 text-primary',
  warn: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  error: 'bg-red-500/10 border-red-500/30 text-red-500',
};

function LogEntryRow({ entry }: { entry: LogEntry }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(entry.timestamp).toLocaleTimeString();

  return (
    <div className="border-outline-variant/50 border-b py-1">
      <button
        className="flex w-full items-center gap-1.5 text-left text-xs"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-on-surface-variant/60 w-16 shrink-0">{time}</span>
        <span
          className={`inline-block rounded border px-1 text-[10px] font-semibold uppercase ${LEVEL_BADGE[entry.level]}`}
        >
          {entry.level}
        </span>
        <span className="text-on-surface truncate">{entry.message}</span>
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-20 text-[10px] font-mono">
          <div className="text-on-surface-variant">scope: {entry.scope}</div>
          {entry.correlationId && (
            <div className="text-on-surface-variant/60">
              correlationId: {entry.correlationId}
            </div>
          )}
          {entry.context && Object.keys(entry.context).length > 0 && (
            <pre className="text-on-surface-variant/60 whitespace-pre-wrap break-all">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          )}
          {entry.error?.stack && (
            <pre className="text-red-400 whitespace-pre-wrap break-all text-[10px]">
              {entry.error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function useMemorySinkEntries(): LogEntry[] {
  const subscribe = (callback: () => void) => {
    const interval = setInterval(callback, 500);
    return () => clearInterval(interval);
  };

  const getSnapshot = () => {
    return _inspectorSink?.entries() ?? [];
  };

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function LogsInspector(): JSX.Element {
  const entries = useMemorySinkEntries();
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.level === filter);

  const counts = {
    debug: entries.filter((e) => e.level === 'debug').length,
    info: entries.filter((e) => e.level === 'info').length,
    warn: entries.filter((e) => e.level === 'warn').length,
    error: entries.filter((e) => e.level === 'error').length,
  };

  return (
    <div className="flex h-full flex-col">
      {/* Summary header */}
      <div className="border-outline-variant/50 mb-2 border-b pb-2">
        <div className="text-on-surface-variant mb-1 text-[10px] uppercase tracking-wider">
          Log Entries ({entries.length} total)
        </div>
        <div className="flex gap-2">
          {(['all', 'debug', 'info', 'warn', 'error'] as const).map((level) => (
            <button
              key={level}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                filter === level
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
              onClick={() => setFilter(level)}
            >
              {level === 'all' ? 'ALL' : level.toUpperCase()}
              {level !== 'all' && (
                <span className="ml-1 opacity-60">({counts[level]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Log list */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-on-surface-variant py-8 text-center text-xs">
            No log entries yet.
          </p>
        ) : (
          filtered.map((entry, i) => (
            <LogEntryRow key={`${entry.timestamp}-${i}`} entry={entry} />
          ))
        )}
      </div>

      {/* Clear button */}
      <div className="border-outline-variant/50 mt-2 border-t pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => _inspectorSink?.clear()}
        >
          Clear Logs
        </Button>
      </div>
    </div>
  );
}
```

#### 2.8.5 — Update `main.tsx` to set the inspector sink

In `apps/dev-server/src/main.tsx`, after creating the `MemorySink`:

```typescript
import { setInspectorSink } from './inspectors/LogsInspector.js';

const memorySink = new MemorySink();
setInspectorSink(memorySink);

createRoot(root).render(
  <StrictMode>
    ...
    <LoggerProvider sinks={[memorySink]}>
      <DevApp />
    </LoggerProvider>
    ...
  </StrictMode>
);
```

---

## Phase 3 — Final Verification

Run all checks:

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Run E2E tests if any exist:

```bash
pnpm test:e2e
```

---

## File Summary

Total new files in `packages/logger/`:

```
packages/logger/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── index.test.ts
│   ├── types.ts
│   ├── types.test.ts
│   ├── version.ts
│   ├── version.test.ts
│   ├── errors.ts
│   ├── errors.test.ts
│   ├── logger.ts
│   ├── logger.test.ts
│   ├── sinks/
│   │   ├── consoleSink.ts
│   │   ├── consoleSink.test.ts
│   │   ├── memorySink.ts
│   │   ├── memorySink.test.ts
│   │   ├── jsonlSink.ts
│   │   ├── jsonlSink.test.ts
│   │   ├── telemetryBridgeSink.ts
│   │   └── telemetryBridgeSink.test.ts
│   └── react/
│       ├── LoggerContext.tsx
│       └── LoggerContext.test.tsx
```

Total files to create: **20**
Total existing files to modify: **~15** (package.json updates + logger integration in 8 packages + learner + dev-server)

## Modified files summary

| File                                                | Change                                      |
| --------------------------------------------------- | ------------------------------------------- |
| `packages/core/package.json`                        | Add `@open-edu/logger` dep                  |
| `packages/core/src/logger.ts`                       | NEW - create scoped loggers                 |
| `packages/core/src/index.ts`                        | Export logger instances                     |
| `packages/core/src/loader.ts`                       | Add log statements                          |
| `packages/core/src/validator.ts`                    | Add log statements                          |
| `packages/workflow/package.json`                    | Add dep                                     |
| `packages/workflow/src/engine.ts`                   | Add log statements                          |
| `packages/ai-companion/package.json`                | Add dep                                     |
| `packages/ai-companion/src/*` (main service)        | Add log statements                          |
| `packages/oep-distribution/package.json`            | Add dep                                     |
| `packages/oep-distribution/src/oep-writer.ts`       | Add log statements                          |
| `packages/oep-distribution/src/oep-reader.ts`       | Add log statements                          |
| `packages/oep-distribution/src/catalog-loader.ts`   | Add log statements                          |
| `packages/pipeline/package.json`                    | Add dep                                     |
| `packages/pipeline/src/extraction/logger.ts`        | Wrap with `@open-edu/logger`                |
| `packages/pipeline/src/cli/logger.ts`               | Wrap with `@open-edu/logger`                |
| `packages/cli/package.json`                         | Add dep                                     |
| `packages/cli/src/cli.ts`                           | Add `--verbose`/`--quiet` flags + configure |
| `packages/cli/src/commands/*.ts`                    | Add scoped logging per command              |
| `apps/learner/package.json`                         | Add dep                                     |
| `apps/learner/src/AppShell.tsx`                     | Add `LoggerProvider` + `MemorySink`         |
| `apps/learner/src/main.tsx`                         | Add global error handlers                   |
| `apps/dev-server/package.json`                      | Add dep                                     |
| `apps/dev-server/src/main.tsx`                      | Add `LoggerProvider` + `MemorySink`         |
| `apps/dev-server/src/inspectors/InspectorPanel.tsx` | Add "Logs" tab                              |
| `apps/dev-server/src/inspectors/LogsInspector.tsx`  | NEW - logs inspector panel                  |
