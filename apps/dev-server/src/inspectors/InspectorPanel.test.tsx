import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InspectorPanel } from './InspectorPanel';
import type { RewardReceipt } from '@open-edu/rewards';

const emptyEvents: never[] = [];

const sampleRewardReceipts: RewardReceipt[] = [
  {
    actionId: 'r1',
    actionType: 'badge.award',
    dispatchedAt: Date.now(),
    status: 'delivered',
    detail: 'Badge awarded',
  },
];

describe('InspectorPanel', () => {
  it('should render telemetry tab by default', () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    expect(screen.getByText('Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Rewards')).toBeInTheDocument();
    expect(screen.getByText('A11y')).toBeInTheDocument();
  });

  it('should switch to accessibility tab on click', async () => {
    render(<InspectorPanel telemetryEvents={emptyEvents} />);
    fireEvent.click(screen.getByText('A11y'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Run Audit' })).toBeInTheDocument();
    });
  });

  it('should switch to rewards tab on click', () => {
    render(
      <InspectorPanel
        telemetryEvents={emptyEvents}
        rewardReceipts={sampleRewardReceipts}
        definedRewards={[{ action: 'badge.award', badge: 'test' }]}
      />,
    );
    fireEvent.click(screen.getByText('Rewards'));
    expect(screen.getByText(/badge\.award/)).toBeInTheDocument();
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

  it('should show rewards in rewards tab', () => {
    render(
      <InspectorPanel
        telemetryEvents={emptyEvents}
        rewardReceipts={sampleRewardReceipts}
        definedRewards={[{ action: 'badge.award', badge: 'test' }]}
      />,
    );
    fireEvent.click(screen.getByText('Rewards'));
    expect(screen.getByText(/badge\.award/)).toBeInTheDocument();
    expect(screen.getByText('delivered')).toBeInTheDocument();
  });
});
