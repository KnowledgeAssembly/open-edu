// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { LoggerProvider, useLogger } from './LoggerContext.js';
import type { LogSink } from '../types.js';
import { MemorySink } from '../sinks/memorySink.js';

function createWrapper(sinks?: LogSink[]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <LoggerProvider sinks={sinks}>{children}</LoggerProvider>;
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
