import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InspectorPanel } from './InspectorPanel';

const emptyEvents: never[] = [];

describe('InspectorPanel', () => {
  it('should render telemetry tab by default', () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
    expect(screen.getByText('A11y')).toBeInTheDocument();
  });

  it('should switch to accessibility tab on click', async () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    fireEvent.click(screen.getByText('A11y'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Audit' })).toBeInTheDocument();
    });
  });

  it('should show telemetry empty state', () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    expect(
      screen.getByText('No telemetry events yet. Interact with the content above.'),
    ).toBeInTheDocument();
  });

  it('should close when close button is clicked', () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    fireEvent.click(screen.getByLabelText('Close inspector panel'));
    expect(screen.getByLabelText('Open inspector panel')).toBeInTheDocument();
  });

  it('should reopen when toggle button is clicked', () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    fireEvent.click(screen.getByLabelText('Close inspector panel'));
    fireEvent.click(screen.getByLabelText('Open inspector panel'));
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
  });
});
