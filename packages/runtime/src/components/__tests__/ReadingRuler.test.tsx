import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReadingRuler } from '../ReadingRuler.js';

describe('ReadingRuler', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<ReadingRuler visible={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders ruler when visible is true', () => {
    render(<ReadingRuler visible={true} />);
    expect(screen.getByTestId('reading-ruler')).toBeInTheDocument();
  });

  it('is hidden from accessibility tree', () => {
    render(<ReadingRuler visible={true} />);
    const ruler = screen.getByTestId('reading-ruler');
    expect(ruler.getAttribute('aria-hidden')).toBe('true');
  });
});
