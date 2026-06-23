import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TelemetryInspector } from './TelemetryInspector';

describe('TelemetryInspector', () => {
  it('should show empty state when no events', () => {
    render(<TelemetryInspector events={[]} />);
    expect(
      screen.getByText('No telemetry events yet. Interact with the content above.'),
    ).toBeInTheDocument();
  });

  it('should render telemetry events', () => {
    const events = [
      { event: 'node_open', nodeId: 'nodes/lesson.md', timestamp: Date.now() },
      { event: 'node_complete', nodeId: 'nodes/lesson.md', score: 100, timestamp: Date.now() },
    ] as never[];

    render(<TelemetryInspector events={events} />);
    expect(screen.getByText('node_open')).toBeInTheDocument();
    expect(screen.getByText('node_complete')).toBeInTheDocument();
    expect(screen.getAllByText(/nodes\/lesson\.md/)).toHaveLength(2);
    expect(screen.getByText(/score: 100/)).toBeInTheDocument();
  });
});
