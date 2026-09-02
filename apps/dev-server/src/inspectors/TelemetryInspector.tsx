import { useRef, useEffect } from 'react';
import type { TelemetryEvent } from '@open-edu/schemas';
import { createSummary } from '@open-edu/telemetry/summary';

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

  const summary = createSummary(events);

  const currentSessionId = events.find((e) => e.sessionId)?.sessionId;

  return (
    <div ref={listRef} className="flex max-h-[calc(100vh-120px)] flex-col gap-1 overflow-auto">
      <div className="bg-success/10 border-outline-variant space-y-0.5 border-b p-2 text-[0.7rem] leading-relaxed">
        <div className="text-success mb-1 text-xs font-semibold">Summary</div>
        <div className="text-on-surface">Events: {summary.totalEvents}</div>
        <div className="text-on-surface">Node opens: {summary.nodeOpens}</div>
        <div className="text-on-surface">Node completions: {summary.nodeCompletions}</div>
        <div className="text-on-surface">
          Avg quiz score:{' '}
          {summary.averageQuizScore !== null ? summary.averageQuizScore.toFixed(1) : 'N/A'}
        </div>
        <div className="text-on-surface">Session: {currentSessionId ?? 'N/A'}</div>
        {summary.sessionCount > 1 && (
          <div className="text-on-surface">Sessions: {summary.sessionCount}</div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-on-surface-variant py-8 text-center text-xs">
          No telemetry events yet. Interact with the content above.
        </div>
      ) : (
        events.map((event, idx) => {
          const eventType = (event as Record<string, unknown>).event as string;
          const timestamp = (event as Record<string, unknown>).timestamp as number;
          const nodeId = (event as Record<string, unknown>).nodeId as string | undefined;
          const score = (event as Record<string, unknown>).score as number | undefined;

          return (
            <div
              key={idx}
              className="bg-surface border-outline-variant break-all rounded border p-1.5 text-xs leading-snug"
            >
              <div>
                <span className="text-primary font-semibold">{eventType}</span>
                {timestamp && (
                  <span className="text-on-surface-variant ml-1">
                    {' '}
                    {new Date(timestamp).toLocaleTimeString()}
                  </span>
                )}
              </div>
              {nodeId && <div className="text-on-surface mt-0.5">node: {nodeId}</div>}
              {typeof score === 'number' && (
                <div className="text-on-surface mt-0.5">score: {score}</div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
