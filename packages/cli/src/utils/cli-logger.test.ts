import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, configureLogger } from '@open-edu/logger';
import type { LogSink, LogEntry } from '@open-edu/logger';
import { ConsoleSink } from '@open-edu/logger';
import { applyCliLogLevel } from './cli-logger.js';

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

describe('applyCliLogLevel', () => {
  beforeEach(() => {
    configureLogger({ minLevel: 'debug', sinks: [new ConsoleSink()] });
  });

  it('enables debug logging with --verbose', () => {
    const { sink, entries } = createMockSink();
    configureLogger({ minLevel: 'info', sinks: [sink] });
    const logger = new Logger({ scope: 'cli:test' });

    applyCliLogLevel({ verbose: true });
    logger.debug('debug line');

    expect(entries.map((e) => e.message)).toEqual(['debug line']);
  });

  it('suppresses non-error output with --quiet', () => {
    const { sink, entries } = createMockSink();
    configureLogger({ minLevel: 'info', sinks: [sink] });
    const logger = new Logger({ scope: 'cli:test' });

    applyCliLogLevel({ quiet: true });
    logger.debug('hidden');
    logger.info('hidden');
    logger.warn('hidden');
    logger.error('shown');

    expect(entries.map((e) => e.message)).toEqual(['shown']);
  });

  it('leaves the level unchanged when no flag is set', () => {
    const { sink, entries } = createMockSink();
    configureLogger({ minLevel: 'info', sinks: [sink] });
    const logger = new Logger({ scope: 'cli:test' });

    applyCliLogLevel({});
    logger.info('shown');
    logger.debug('hidden');

    expect(entries.map((e) => e.message)).toEqual(['shown']);
  });
});
