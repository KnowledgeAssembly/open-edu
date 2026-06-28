import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '../breadcrumb.jsx';

describe('Breadcrumb', () => {
  it('renders items', () => {
    render(<Breadcrumb items={[{ label: 'Home' }, { label: 'Section' }]} />);
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Section')).toBeDefined();
  });

  it('renders links for items with href', () => {
    render(<Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Current' }]} />);
    const link = screen.getByText('Home');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/');
  });

  it('sets aria-label', () => {
    render(<Breadcrumb items={[{ label: 'Home' }]} />);
    expect(screen.getByLabelText('Breadcrumb')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(Breadcrumb.displayName).toBe('Breadcrumb');
  });
});
