import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfettiBurst } from '../ConfettiBurst';

describe('ConfettiBurst', () => {
  it('renders particles', () => {
    render(<ConfettiBurst />);
    const burst = screen.getByTestId('confetti-burst');
    expect(burst).toBeInTheDocument();
    expect(burst.children.length).toBeGreaterThan(0);
  });

  it('respects particleCount prop', () => {
    render(<ConfettiBurst particleCount={10} />);
    const burst = screen.getByTestId('confetti-burst');
    expect(burst.children.length).toBe(10);
  });

  it('has displayName', () => {
    expect(ConfettiBurst.displayName).toBe('ConfettiBurst');
  });
});
