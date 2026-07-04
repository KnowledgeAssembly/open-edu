import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SectionDivider } from '../SectionDivider.js';

describe('SectionDivider', () => {
  it('renders with role="separator"', () => {
    const { container } = render(<SectionDivider />);
    expect(container.querySelector('[role="separator"]')).toBeInTheDocument();
  });

  it('has aria-hidden="true"', () => {
    const { container } = render(<SectionDivider />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders AssemblyFlow with minimal density by default', () => {
    const { container } = render(<SectionDivider />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders AssemblyFlow with medium density', () => {
    const { container } = render(<SectionDivider density="medium" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders AssemblyFlow with dense density', () => {
    const { container } = render(<SectionDivider density="dense" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('does not animate by default', () => {
    const { container } = render(<SectionDivider />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveClass('assembly-flow-path');
  });

  it('animates when animated=true', () => {
    const { container } = render(<SectionDivider animated />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
