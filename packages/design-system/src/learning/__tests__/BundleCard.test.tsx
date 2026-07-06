import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BundleCard } from '../BundleCard.js';
import type { BundleCardProps } from '../BundleCard.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

function makeProps(overrides: Partial<BundleCardProps> = {}): BundleCardProps {
  return {
    title: 'Level B Math',
    description: 'A comprehensive math bundle',
    moduleCount: 3,
    activityCount: 24,
    completedModules: 1,
    totalModules: 3,
    isStarted: true,
    onStart: vi.fn(),
    ...overrides,
  };
}

describe('BundleCard', () => {
  it('renders title', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('Level B Math')).toBeInTheDocument();
  });

  it('renders Bundle badge', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('Bundle')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('A comprehensive math bundle')).toBeInTheDocument();
  });

  it('shows module count fallback when no description', () => {
    render(<BundleCard {...makeProps({ description: undefined })} />);
    expect(screen.getAllByText('3 modules')).toHaveLength(2);
  });

  it('shows module and activity counts', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('3 modules')).toBeInTheDocument();
    expect(screen.getByText('24 activities')).toBeInTheDocument();
  });

  it('shows progress bar when started', () => {
    render(<BundleCard {...makeProps()} />);
    expect(screen.getByText('1 of 3 complete')).toBeInTheDocument();
  });

  it('hides progress bar when not started', () => {
    render(<BundleCard {...makeProps({ isStarted: false })} />);
    expect(screen.queryByText('1 of 3 complete')).not.toBeInTheDocument();
  });

  it('calls onStart when card is clicked', () => {
    const onStart = vi.fn();
    render(<BundleCard {...makeProps({ onStart })} />);
    const card = screen.getByTestId('bundle-card');
    fireEvent.click(card);
    expect(onStart).toHaveBeenCalledOnce();
  });

  it('handles zero total modules gracefully', () => {
    render(<BundleCard {...makeProps({ totalModules: 0, completedModules: 0 })} />);
    expect(screen.getByText('0 of 0 complete')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<BundleCard {...makeProps()} />);
  });
});
