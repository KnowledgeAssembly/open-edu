import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpenEduLogo } from '../openedu-logo';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('OpenEduLogo', () => {
  it('renders lockup variant by default', () => {
    render(<OpenEduLogo data-testid="logo" />);
    const el = screen.getByTestId('logo');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('OpenEdu');
    expect(el.textContent).toContain('Knowledge assembled');
  });

  it('renders symbol variant', () => {
    render(<OpenEduLogo variant="symbol" data-testid="logo" />);
    const el = screen.getByTestId('logo');
    expect(el).toBeInTheDocument();
    expect(el.querySelector('svg')).toBeInTheDocument();
    expect(el).toHaveAttribute('role', 'img');
    expect(el).toHaveAttribute('aria-label', 'OpenEdu');
  });

  it('renders wordmark variant', () => {
    render(<OpenEduLogo variant="wordmark" data-testid="logo" />);
    const el = screen.getByTestId('logo');
    expect(el).toBeInTheDocument();
    expect(el.textContent).toContain('open');
    expect(el.textContent).toContain('edu');
    const dotSvg = el.querySelector('svg[aria-hidden="true"]');
    expect(dotSvg).toBeInTheDocument();
  });

  it('renders with sm size', () => {
    render(<OpenEduLogo size="sm" data-testid="logo" />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('renders with lg size', () => {
    render(<OpenEduLogo size="lg" data-testid="logo" />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('hides interior symbol SVG with aria-hidden in lockup variant', () => {
    render(<OpenEduLogo variant="lockup" data-testid="logo" />);
    const svgs = screen.getByTestId('logo').querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    render(<OpenEduLogo className="ml-4" data-testid="logo" />);
    expect(screen.getByTestId('logo')).toHaveClass('ml-4');
  });

  describe('accessibility', () => {
    it('lockup has no violations', async () => {
      await checkAccessibility(<OpenEduLogo />);
    });

    it('symbol has no violations', async () => {
      await checkAccessibility(<OpenEduLogo variant="symbol" />);
    });

    it('wordmark has no violations', async () => {
      await checkAccessibility(<OpenEduLogo variant="wordmark" />);
    });
  });
});
