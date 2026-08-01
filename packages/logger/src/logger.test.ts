import { describe, it, expect, beforeEach } from 'vitest';
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

    it('applies a new global minLevel to loggers created before the change', () => {
      const { sink, entries } = createMockSink();
      configureLogger({ minLevel: 'debug', sinks: [sink] });
      const logger = new Logger({ scope: 'pre-existing' });

      logger.info('before');
      configureLogger({ minLevel: 'error', sinks: [sink] });
      logger.info('suppressed');
      logger.warn('suppressed');
      logger.error('after');

      expect(entries.map((e) => e.message)).toEqual(['before', 'after']);
    });

    it('suppresses debug by default at the info level', () => {
      const { sink, entries } = createMockSink();
      configureLogger({ minLevel: 'info', sinks: [sink] });
      const logger = new Logger({ scope: 'default-level' });

      logger.debug('hidden');
      logger.info('shown');

      expect(entries.map((e) => e.message)).toEqual(['shown']);
    });
  });
});
