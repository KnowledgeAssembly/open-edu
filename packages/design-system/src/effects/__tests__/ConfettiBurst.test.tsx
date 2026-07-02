import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

  it('renders with default particleCount of 16', () => {
    render(<ConfettiBurst />);
    const burst = screen.getByTestId('confetti-burst');
    expect(burst.children.length).toBe(16);
  });

  it('applies className prop', () => {
    render(<ConfettiBurst className="custom-class" />);
    const burst = screen.getByTestId('confetti-burst');
    expect(burst.className).toContain('custom-class');
  });

  it('sets aria-hidden on container', () => {
    render(<ConfettiBurst />);
    const burst = screen.getByTestId('confetti-burst');
    expect(burst).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies duration prop to particle animations', () => {
    render(<ConfettiBurst particleCount={1} duration={3} />);
    const burst = screen.getByTestId('confetti-burst');
    const particle = burst.children[0] as HTMLElement;
    expect(particle.getAttribute('style')).toContain('3s');
  });

  it('accepts custom colors', () => {
    render(<ConfettiBurst particleCount={2} colors={['#ff0000', '#00ff00']} />);
    const burst = screen.getByTestId('confetti-burst');
    const firstParticle = burst.children[0] as HTMLElement;
    expect(firstParticle.getAttribute('style')).toContain('rgb(255, 0, 0)');
  });

  it('returns null after animation completes', () => {
    vi.useFakeTimers();
    const { container } = render(<ConfettiBurst />);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(container.innerHTML).toBe('');
    vi.useRealTimers();
  });
});
