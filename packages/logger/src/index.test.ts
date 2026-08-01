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
