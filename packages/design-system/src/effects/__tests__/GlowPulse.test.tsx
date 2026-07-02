import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlowPulse } from '../GlowPulse';

describe('GlowPulse', () => {
  it('renders children', () => {
    render(<GlowPulse><span>child</span></GlowPulse>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('has glow-pulse testid', () => {
    render(<GlowPulse><span>child</span></GlowPulse>);
    expect(screen.getByTestId('glow-pulse')).toBeInTheDocument();
  });

  it('has displayName set', () => {
    expect(GlowPulse.displayName).toBe('GlowPulse');
  });

  it('accepts and uses intensity prop', () => {
    render(<GlowPulse intensity={2}><span>intense</span></GlowPulse>);
    const container = screen.getByTestId('glow-pulse');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('intense')).toBeInTheDocument();
  });
});
