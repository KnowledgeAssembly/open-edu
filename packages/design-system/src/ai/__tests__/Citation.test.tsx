import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Citation } from '../Citation.jsx';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('Citation', () => {
  it('renders source label', () => {
    render(<Citation source="Wikipedia">Content</Citation>);
    expect(screen.getByText('Wikipedia')).toBeDefined();
  });

  it('renders children', () => {
    render(<Citation source="Test">Cited content</Citation>);
    expect(screen.getByText('Cited content')).toBeDefined();
  });

  it('has data-testid', () => {
    render(<Citation source="Src">Text</Citation>);
    expect(screen.getByTestId('citation')).toBeDefined();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<Citation source="Test Source">Cited content</Citation>);
  });
});
