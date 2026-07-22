import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BundleOverview } from './BundleOverview';
import type { BundleOverviewModule } from './BundleOverview';

const mockModules: BundleOverviewModule[] = [
  {
    id: 'mod-a',
    title: 'Addition Basics',
    chapterCode: 'CH1',
    status: 'completed',
    nodeCount: 5,
    completedNodeCount: 5,
    estimatedDuration: 30,
  },
  {
    id: 'mod-b',
    title: 'Addition with Carry',
    status: 'unlocked',
    nodeCount: 4,
    completedNodeCount: 0,
    estimatedDuration: 25,
  },
  {
    id: 'mod-c',
    title: 'Adding Fractions',
    status: 'locked',
    nodeCount: 6,
    completedNodeCount: 0,
    estimatedDuration: 35,
    prerequisiteLabel: 'Complete Addition with Carry first',
  },
  {
    id: 'mod-d',
    title: 'Module In Progress',
    status: 'in_progress',
    nodeCount: 10,
    completedNodeCount: 3,
    estimatedDuration: 45,
  },
];

describe('BundleOverview', () => {
  const baseProps = {
    bundleTitle: 'Level B Math',
    bundleId: 'level-b-math',
    description: 'A comprehensive math bundle',
    modules: mockModules,
    onStartModule: vi.fn(),
    onContinueModule: vi.fn(),
    onBackToCatalog: vi.fn(),
  };

  it('renders bundle title and description', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('Level B Math')).toBeDefined();
    expect(screen.getByText('A comprehensive math bundle')).toBeDefined();
  });

  it('renders all module titles', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('Addition Basics')).toBeDefined();
    expect(screen.getByText('Addition with Carry')).toBeDefined();
    expect(screen.getByText('Adding Fractions')).toBeDefined();
    expect(screen.getByText('Module In Progress')).toBeDefined();
  });

  it('shows locked module with prerequisite label', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('Complete Addition with Carry first')).toBeDefined();
  });

  it('shows Start button for unlocked module', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByTestId('start-module-mod-b')).toBeDefined();
  });

  it('shows Continue button for in-progress module', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByTestId('continue-module-mod-d')).toBeDefined();
  });

  it('shows completed status for completed module', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('calls onStartModule when Start is clicked', () => {
    const onStartModule = vi.fn();
    render(<BundleOverview {...baseProps} onStartModule={onStartModule} />);
    fireEvent.click(screen.getByTestId('start-module-mod-b'));
    expect(onStartModule).toHaveBeenCalledWith('mod-b');
  });

  it('calls onContinueModule when Continue is clicked', () => {
    const onContinueModule = vi.fn();
    render(<BundleOverview {...baseProps} onContinueModule={onContinueModule} />);
    fireEvent.click(screen.getByTestId('continue-module-mod-d'));
    expect(onContinueModule).toHaveBeenCalledWith('mod-d');
  });

  it('calls onBackToCatalog when back button is clicked', () => {
    const onBackToCatalog = vi.fn();
    render(<BundleOverview {...baseProps} onBackToCatalog={onBackToCatalog} />);
    fireEvent.click(screen.getByTestId('back-to-catalog'));
    expect(onBackToCatalog).toHaveBeenCalled();
  });

  it('renders without description', () => {
    const { description: _, ...props } = baseProps;
    render(<BundleOverview {...(props as any)} />);
    expect(screen.getByText('Level B Math')).toBeDefined();
  });

  it('renders empty state for empty modules', () => {
    render(<BundleOverview {...baseProps} modules={[]} />);
    expect(screen.getByText('No modules in this bundle.')).toBeDefined();
  });

  it('shows chapter code badge when present', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('CH1')).toBeDefined();
  });

  it('shows estimated duration and activity count for unlocked modules', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByText('~25 min')).toBeDefined();
    expect(screen.getByText('0 of 4 activities')).toBeDefined();
  });

  it('does not show estimated duration for in-progress modules', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.queryByText('~45 min')).toBeNull();
  });

  it('renders with data-testid attributes', () => {
    render(<BundleOverview {...baseProps} />);
    expect(screen.getByTestId('bundle-overview')).toBeDefined();
    expect(screen.getByTestId('page-header')).toBeDefined();
    expect(screen.getByTestId('overall-progress')).toBeDefined();
    expect(screen.getByTestId('module-list')).toBeDefined();
    expect(screen.getByTestId('back-to-catalog')).toBeDefined();
  });
});
