import { useRef, useEffect } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';

interface TelemetryInspectorProps {
  events: TelemetryEvent[];
}

export function TelemetryInspector({ events }: TelemetryInspectorProps): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events.length]);

  const containerStyle: Record<string, React.CSSProperties> = {
    empty: {
      color: '#9ca3af',
      textAlign: 'center',
      padding: '2rem 0',
      fontSize: '0.75rem',
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

  if (events.length === 0) {
    return (
      <div style={containerStyle.empty}>
        No telemetry events yet. Interact with the content above.
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      style={{ ...containerStyle.list, maxHeight: 'calc(100vh - 120px)', overflow: 'auto' }}
    >
      {events.map((event, idx) => {
        const eventType = (event as Record<string, unknown>).event as string;
        const timestamp = (event as Record<string, unknown>).timestamp as number;
        const nodeId = (event as Record<string, unknown>).nodeId as string | undefined;
        const score = (event as Record<string, unknown>).score as number | undefined;

        return (
          <div key={idx} style={containerStyle.event}>
            <div>
              <span style={containerStyle.type}>{eventType}</span>
              {timestamp && (
                <span style={containerStyle.meta}> {new Date(timestamp).toLocaleTimeString()}</span>
              )}
            </div>
            {nodeId && <div style={containerStyle.data}>node: {nodeId}</div>}
            {typeof score === 'number' && <div style={containerStyle.data}>score: {score}</div>}
          </div>
        );
      })}
    </div>
  );
}
