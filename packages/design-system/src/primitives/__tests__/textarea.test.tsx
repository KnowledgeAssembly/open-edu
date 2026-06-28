import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from '../textarea.jsx';

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('sets displayName', () => {
    expect(Textarea.displayName).toBe('Textarea');
  });
});
