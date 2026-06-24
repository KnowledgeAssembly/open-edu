import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelemetryInspector } from './TelemetryInspector';

describe('TelemetryInspector', () => {
  it('should show summary with zero-state metrics when no events', () => {
    render(<TelemetryInspector events={[]} />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Events: 0')).toBeInTheDocument();
    expect(screen.getByText('Node opens: 0')).toBeInTheDocument();
    expect(screen.getByText('Node completions: 0')).toBeInTheDocument();
    expect(screen.getByText('Avg quiz score: N/A')).toBeInTheDocument();
    expect(screen.getByText('Session: N/A')).toBeInTheDocument();
    expect(
      screen.getByText('No telemetry events yet. Interact with the content above.'),
    ).toBeInTheDocument();
  });

  it('should show summary metrics for emitted events', () => {
    const events = [
      { event: 'node_open', nodeId: 'nodes/lesson.md', timestamp: 1000, sessionId: 'sess-1' },
      {
        event: 'node_complete',
        nodeId: 'nodes/lesson.md',
        score: 85,
        timestamp: 2000,
        sessionId: 'sess-1',
      },
      { event: 'node_open', nodeId: 'nodes/quiz.md', timestamp: 3000, sessionId: 'sess-1' },
      {
        event: 'node_complete',
        nodeId: 'nodes/quiz.md',
        score: 92,
        timestamp: 4000,
        sessionId: 'sess-1',
      },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('Events: 4')).toBeInTheDocument();
    expect(screen.getByText('Node opens: 2')).toBeInTheDocument();
    expect(screen.getByText('Node completions: 2')).toBeInTheDocument();
    expect(screen.getByText('Avg quiz score: 88.5')).toBeInTheDocument();
    expect(screen.getByText('Session: sess-1')).toBeInTheDocument();
  });

  it('should show N/A for avg quiz score when no scores present', () => {
    const events = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 's1' },
      { event: 'node_complete', nodeId: 'n1', timestamp: 2000, sessionId: 's1' },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('Avg quiz score: N/A')).toBeInTheDocument();
  });

  it('should show multi-session count when multiple sessions present', () => {
    const events = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 's1' },
      { event: 'node_open', nodeId: 'n2', timestamp: 2000, sessionId: 's2' },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('Sessions: 2')).toBeInTheDocument();
  });

  it('should render raw telemetry events', () => {
    const events = [
      { event: 'node_open', nodeId: 'nodes/lesson.md', timestamp: Date.now() },
      { event: 'node_complete', nodeId: 'nodes/lesson.md', score: 100, timestamp: Date.now() },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('node_open')).toBeInTheDocument();
    expect(screen.getByText('node_complete')).toBeInTheDocument();
    expect(screen.getAllByText(/nodes\/lesson\.md/)).toHaveLength(2);
    expect(screen.getByText(/^score: 100$/)).toBeInTheDocument();
  });

  it('should show current session ID from first event with sessionId', () => {
    const events = [
      { event: 'node_open', nodeId: 'n1', timestamp: 1000, sessionId: 'active-session' },
      { event: 'node_open', nodeId: 'n2', timestamp: 2000 },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('Session: active-session')).toBeInTheDocument();
  });
});
