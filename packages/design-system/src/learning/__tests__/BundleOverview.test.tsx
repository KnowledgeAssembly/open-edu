import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BundleOverview } from '../BundleOverview.js';
import type { BundleOverviewModule } from '../BundleOverview.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

const sampleModules: BundleOverviewModule[] = [
  {
    id: 'mod-1',
    title: 'Module 1: Introduction',
    status: 'unlocked',
    nodeCount: 5,
    completedNodeCount: 0,
    estimatedDuration: 15,
  },
  {
    id: 'mod-2',
    title: 'Module 2: Advanced',
    status: 'in_progress',
    nodeCount: 8,
    completedNodeCount: 3,
    estimatedDuration: 20,
  },
  {
    id: 'mod-3',
    title: 'Module 3: Final',
    status: 'completed',
    nodeCount: 6,
    completedNodeCount: 6,
    estimatedDuration: 10,
  },
  {
    id: 'mod-4',
    title: 'Module 4: Bonus',
    status: 'locked',
    nodeCount: 4,
    completedNodeCount: 0,
    prerequisiteLabel: 'Complete Module 3 first',
  },
];

function renderDefault(overrides = {}) {
  const props = {
    bundleTitle: 'Test Bundle',
    bundleId: 'test-bundle',
    description: 'A test bundle description.',
    modules: sampleModules,
    onStartModule: vi.fn(),
    onContinueModule: vi.fn(),
    onBackToCatalog: vi.fn(),
    ...overrides,
  };
  return render(<BundleOverview {...props} />);
}

describe('BundleOverview', () => {
  it('renders bundle title', () => {
    renderDefault();
    expect(screen.getByText('Test Bundle')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderDefault();
    expect(screen.getByText('A test bundle description.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    renderDefault({ description: undefined });
    expect(screen.queryByText('A test bundle description.')).toBeNull();
  });

  it('renders module cards', () => {
    renderDefault();
    const cards = screen.getAllByTestId('module-card');
    expect(cards).toHaveLength(4);
  });

  it('shows "Start" button for unlocked modules', () => {
    renderDefault();
    expect(screen.getByTestId('start-module-mod-1')).toBeInTheDocument();
    expect(screen.getByTestId('start-module-mod-1')).toHaveTextContent('Start');
  });

  it('shows "Continue" button for in_progress modules when onContinueModule provided', () => {
    renderDefault();
    expect(screen.getByTestId('continue-module-mod-2')).toBeInTheDocument();
    expect(screen.getByTestId('continue-module-mod-2')).toHaveTextContent('Continue');
  });

  it('does not show "Continue" button when onContinueModule is not provided', () => {
    renderDefault({ onContinueModule: undefined });
    expect(screen.queryByTestId('continue-module-mod-2')).toBeNull();
  });

  it('shows "Completed" for completed modules', () => {
    renderDefault();
    expect(screen.getByTestId('completed-module-mod-3')).toHaveTextContent('Completed');
  });

  it('shows locked state with prerequisite label', () => {
    renderDefault();
    expect(screen.getByText('Complete Module 3 first')).toBeInTheDocument();
    expect(screen.getByTestId('module-status-locked')).toBeInTheDocument();
  });

  it('shows empty state when no modules', () => {
    renderDefault({ modules: [] });
    expect(screen.getByText('No modules in this bundle.')).toBeInTheDocument();
  });

  it('back to catalog button fires callback', () => {
    const onBackToCatalog = vi.fn();
    renderDefault({ onBackToCatalog });
    fireEvent.click(screen.getByTestId('back-to-catalog'));
    expect(onBackToCatalog).toHaveBeenCalledOnce();
  });

  it('start button fires onStartModule', () => {
    const onStartModule = vi.fn();
    renderDefault({ onStartModule });
    fireEvent.click(screen.getByTestId('start-module-mod-1'));
    expect(onStartModule).toHaveBeenCalledWith('mod-1');
  });

  it('continue button fires onContinueModule', () => {
    const onContinueModule = vi.fn();
    renderDefault({ onContinueModule });
    fireEvent.click(screen.getByTestId('continue-module-mod-2'));
    expect(onContinueModule).toHaveBeenCalledWith('mod-2');
  });

  it('shows estimated duration and activity count for unlocked modules', () => {
    renderDefault();
    expect(screen.getByText('~15 min · 5 activities')).toBeInTheDocument();
  });

  it('does not show estimated duration for completed modules', () => {
    renderDefault();
    expect(screen.queryByText('~10 min')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <BundleOverview
        bundleTitle="Test"
        bundleId="test"
        modules={[]}
        onStartModule={vi.fn()}
        onBackToCatalog={vi.fn()}
      />,
    );
  });
});
