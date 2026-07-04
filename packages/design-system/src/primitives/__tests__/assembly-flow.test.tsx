import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssemblyFlow } from '../assembly-flow';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('AssemblyFlow', () => {
  it('renders with default density', () => {
    render(<AssemblyFlow data-testid="flow" />);
    const svg = screen.getByTestId('flow');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders path element', () => {
    render(<AssemblyFlow data-testid="flow" />);
    const path = screen.getByTestId('flow').querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('d');
  });

  it('renders circles for nodes', () => {
    render(<AssemblyFlow data-testid="flow" />);
    const circles = screen.getByTestId('flow').querySelectorAll('circle');
    expect(circles.length).toBe(5); // medium density has 5 nodes
  });

  it('renders dense variant with more nodes', () => {
    render(<AssemblyFlow density="dense" data-testid="flow" />);
    const circles = screen.getByTestId('flow').querySelectorAll('circle');
    expect(circles.length).toBeGreaterThan(5);
  });

  it('renders minimal variant with fewer nodes', () => {
    render(<AssemblyFlow density="minimal" data-testid="flow" />);
    const circles = screen.getByTestId('flow').querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders animated variant without error', () => {
    render(<AssemblyFlow animated data-testid="flow" />);
    expect(screen.getByTestId('flow')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AssemblyFlow className="max-w-md" data-testid="flow" />);
    expect(screen.getByTestId('flow')).toHaveClass('max-w-md');
  });

  describe('accessibility', () => {
    it('has no violations with default density', async () => {
      await checkAccessibility(<AssemblyFlow />);
    });

    it('has no violations with dense density', async () => {
      await checkAccessibility(<AssemblyFlow density="dense" />);
    });

    it('has no violations with minimal density', async () => {
      await checkAccessibility(<AssemblyFlow density="minimal" />);
    });

    it('has no violations when animated', async () => {
      await checkAccessibility(<AssemblyFlow animated />);
    });
  });
});
