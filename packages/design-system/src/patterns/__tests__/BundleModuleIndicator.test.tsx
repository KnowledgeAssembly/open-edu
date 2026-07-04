import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BundleModuleIndicator } from '../BundleModuleIndicator.js';

describe('BundleModuleIndicator', () => {
  it('renders with locked status', () => {
    const { container } = render(<BundleModuleIndicator status="locked" />);
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('renders with unlocked status', () => {
    const { container } = render(<BundleModuleIndicator status="unlocked" />);
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('renders with in-progress status', () => {
    const { container } = render(<BundleModuleIndicator status="in-progress" />);
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('renders with completed status', () => {
    const { container } = render(<BundleModuleIndicator status="completed" />);
    const module = container.querySelector('[aria-hidden="true"]');
    expect(module).toBeInTheDocument();
  });

  it('shows completion percent when in-progress', () => {
    render(<BundleModuleIndicator status="in-progress" completionPercent={42} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('does not show completion percent when locked', () => {
    render(<BundleModuleIndicator status="locked" completionPercent={42} />);
    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  it('OpenModule has aria-hidden="true"', () => {
    const { container } = render(<BundleModuleIndicator status="locked" />);
    const hidden = container.querySelector('[aria-hidden="true"]');
    expect(hidden).toBeInTheDocument();
  });
});
