import { useState, useSyncExternalStore } from 'react';
import type { MemorySink, LogEntry, LogLevel } from '@open-edu/logger';
import { Button } from '../components/ui/button';

let _inspectorSink: MemorySink | null = null;
let _inspectorSnapshot: LogEntry[] = [];

export function setInspectorSink(sink: MemorySink | null): void {
  _inspectorSink = sink;
  _inspectorSnapshot = [];
}

export function getInspectorSink(): MemorySink | null {
  return _inspectorSink;
}

const LEVEL_BADGE: Record<LogLevel, string> = {
  debug: 'bg-transparent border-outline-variant text-on-surface-variant',
  info: 'bg-primary/10 border-primary/30 text-primary',
  warn: 'bg-warning/10 border-warning/30 text-warning',
  error: 'bg-error/10 border-error/30 text-error',
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
        <div className="mt-1 space-y-0.5 pl-20 font-mono text-[10px]">
          <div className="text-on-surface-variant">scope: {entry.scope}</div>
          {entry.correlationId && (
            <div className="text-on-surface-variant/60">correlationId: {entry.correlationId}</div>
          )}
          {entry.context && Object.keys(entry.context).length > 0 && (
            <pre className="text-on-surface-variant/60 whitespace-pre-wrap break-all">
              {JSON.stringify(entry.context, null, 2)}
            </pre>
          )}
          {entry.error?.stack && (
            <pre className="text-error whitespace-pre-wrap break-all text-[10px]">
              {entry.error.stack}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function getInspectorSnapshot(): LogEntry[] {
  const entries = _inspectorSink?.entries() ?? [];
  const lengthChanged = _inspectorSnapshot.length !== entries.length;
  const firstChanged =
    _inspectorSnapshot.length > 0 && !Object.is(_inspectorSnapshot[0], entries[0]);
  const lastChanged =
    _inspectorSnapshot.length > 0 &&
    !Object.is(_inspectorSnapshot[_inspectorSnapshot.length - 1], entries[entries.length - 1]);
  if (lengthChanged || firstChanged || lastChanged) {
    _inspectorSnapshot = entries;
  }
  return _inspectorSnapshot;
}

function useMemorySinkEntries(): LogEntry[] {
  const subscribe = (callback: () => void) => {
    const interval = setInterval(callback, 500);
    return () => clearInterval(interval);
  };

  const getSnapshot = () => getInspectorSnapshot();

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function LogsInspector(): JSX.Element {
  const entries = useMemorySinkEntries();
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.level === filter);

  const counts = {
    debug: entries.filter((e) => e.level === 'debug').length,
    info: entries.filter((e) => e.level === 'info').length,
    warn: entries.filter((e) => e.level === 'warn').length,
    error: entries.filter((e) => e.level === 'error').length,
  };

  return (
    <div className="flex h-full flex-col">
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
              {level !== 'all' && <span className="ml-1 opacity-60">({counts[level]})</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-on-surface-variant py-8 text-center text-xs">No log entries yet.</p>
        ) : (
          filtered.map((entry, i) => <LogEntryRow key={`${entry.timestamp}-${i}`} entry={entry} />)
        )}
      </div>

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
