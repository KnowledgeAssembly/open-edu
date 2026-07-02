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

  it('applies className prop', () => {
    render(<GlowPulse className="custom-class"><span>child</span></GlowPulse>);
    const container = screen.getByTestId('glow-pulse');
    expect(container.className).toContain('custom-class');
  });

  it('renders with default intensity of 1', () => {
    const { container } = render(<GlowPulse><span>child</span></GlowPulse>);
    const styleTag = container.querySelector('style');
    expect(styleTag?.textContent).toContain('20px');
    expect(styleTag?.textContent).toContain('8px');
  });

  it('applies duration prop to keyframes', () => {
    const { container } = render(<GlowPulse duration={2.5}><span>child</span></GlowPulse>);
    const styleTag = container.querySelector('style');
    expect(styleTag?.textContent).toContain('2.5s');
  });

  it('renders with custom color prop', () => {
    const { container } = render(<GlowPulse color="#ff0000"><span>child</span></GlowPulse>);
    const styleTag = container.querySelector('style');
    expect(styleTag?.textContent).toContain('#ff0000');
  });
});
