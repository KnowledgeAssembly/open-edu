import { useRef, useEffect } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import { createSummary } from '@open-edu/telemetry';

interface TelemetryInspectorProps {
  events: TelemetryEvent[];
}

const containerStyle: Record<string, React.CSSProperties> = {
  empty: {
    color: '#9ca3af',
    textAlign: 'center',
    padding: '2rem 0',
    fontSize: '0.75rem',
  },
  summary: {
    padding: '0.5rem',
    backgroundColor: '#f0fdf4',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.7rem',
    lineHeight: 1.5,
  },
  summaryTitle: {
    fontWeight: 600,
    color: '#166534',
    marginBottom: '0.25rem',
    fontSize: '0.75rem',
  },
  summaryRow: {
    color: '#374151',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  event: {
    padding: '0.375rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    border: '1px solid #f3f4f6',
    fontSize: '0.75rem',
    lineHeight: 1.4,
    wordBreak: 'break-all',
  },
  type: {
    fontWeight: 600,
    color: '#2563eb',
  },
  meta: {
    color: '#6b7280',
  },
  data: {
    color: '#374151',
    marginTop: '0.125rem',
  },
};

export function TelemetryInspector({ events }: TelemetryInspectorProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events.length]);

  const summary = createSummary(events);

  const currentSessionId = events.find((e) => e.sessionId)?.sessionId;

  return (
    <div
      ref={listRef}
      style={{
        ...containerStyle.list,
        maxHeight: 'calc(100vh - 120px)',
        overflow: 'auto',
      }}
    >
      <div style={containerStyle.summary}>
        <div style={containerStyle.summaryTitle}>Summary</div>
        <div style={containerStyle.summaryRow}>Events: {summary.totalEvents}</div>
        <div style={containerStyle.summaryRow}>Node opens: {summary.nodeOpens}</div>
        <div style={containerStyle.summaryRow}>Node completions: {summary.nodeCompletions}</div>
        <div style={containerStyle.summaryRow}>
          Avg quiz score:{' '}
          {summary.averageQuizScore !== null ? summary.averageQuizScore.toFixed(1) : 'N/A'}
        </div>
        <div style={containerStyle.summaryRow}>Session: {currentSessionId ?? 'N/A'}</div>
        {summary.sessionCount > 1 && (
          <div style={containerStyle.summaryRow}>Sessions: {summary.sessionCount}</div>
        )}
      </div>

      {events.length === 0 ? (
        <div style={containerStyle.empty}>
          No telemetry events yet. Interact with the content above.
        </div>
      ) : (
        events.map((event, idx) => {
          const eventType = (event as Record<string, unknown>).event as string;
          const timestamp = (event as Record<string, unknown>).timestamp as number;
          const nodeId = (event as Record<string, unknown>).nodeId as string | undefined;
          const score = (event as Record<string, unknown>).score as number | undefined;

          return (
            <div key={idx} style={containerStyle.event}>
              <div>
                <span style={containerStyle.type}>{eventType}</span>
                {timestamp && (
                  <span style={containerStyle.meta}>
                    {' '}
                    {new Date(timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {nodeId && <div style={containerStyle.data}>node: {nodeId}</div>}
              {typeof score === 'number' && <div style={containerStyle.data}>score: {score}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
