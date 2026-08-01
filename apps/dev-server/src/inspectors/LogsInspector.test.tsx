import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemorySink } from '@open-edu/logger';
import type { LogEntry } from '@open-edu/logger';
import { LogsInspector, setInspectorSink } from './LogsInspector';

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: 'info',
    scope: 'test',
    message: 'hello from logger',
    ...overrides,
  };
}

describe('LogsInspector', () => {
  let sink: MemorySink;

  beforeEach(() => {
    sink = new MemorySink();
    setInspectorSink(sink);
  });

  afterEach(() => {
    setInspectorSink(null);
  });

  it('renders log entries from the shared MemorySink', async () => {
    sink.write(makeEntry());
    render(<LogsInspector />);

    expect(await screen.findByText('hello from logger')).toBeInTheDocument();
  });

  it('shows an empty state when there are no entries', () => {
    render(<LogsInspector />);
    expect(screen.getByText('No log entries yet.')).toBeInTheDocument();
  });

  it('filters entries by level', async () => {
    sink.write(makeEntry({ level: 'info', message: 'info message' }));
    sink.write(makeEntry({ level: 'error', message: 'error message' }));
    render(<LogsInspector />);

    expect(await screen.findByText('info message')).toBeInTheDocument();
    expect(screen.getByText('error message')).toBeInTheDocument();

    const errorButton = screen.getByText('ERROR').closest('button');
    errorButton!.click();

    await waitFor(() => {
      expect(screen.queryByText('info message')).not.toBeInTheDocument();
    });
    expect(screen.getByText('error message')).toBeInTheDocument();
  });

  it('clears log entries when the clear button is pressed', async () => {
    sink.write(makeEntry());
    render(<LogsInspector />);
    expect(await screen.findByText('hello from logger')).toBeInTheDocument();

    const clearButton = screen.getByText('Clear Logs');
    clearButton.click();

    await waitFor(() => {
      expect(screen.getByText('No log entries yet.')).toBeInTheDocument();
    });
  });
});
