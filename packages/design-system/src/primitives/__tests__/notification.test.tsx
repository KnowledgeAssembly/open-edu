import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Toaster } from '../notification.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Toaster', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Toaster />);
  });
  it('renders sonner Toaster', () => {
    const { container } = render(<Toaster />);
    expect(container.querySelector('.toaster')).toBeDefined();
  });

  it('applies custom className', () => {
    const { container } = render(<Toaster className="custom-toaster" />);
    expect(container.querySelector('.custom-toaster')).toBeDefined();
  });
});
