import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AxeValidator } from './AxeValidator';

vi.mock('axe-core', () => ({
  default: {
    run: vi.fn().mockResolvedValue({
      violations: [],
      passes: [{ id: 'color-contrast' }],
    }),
  },
}));

describe('AxeValidator', () => {
  it('should render null in non-dev mode', () => {
    const env = process.env.NODE_ENV;
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<AxeValidator />);
    expect(container.innerHTML).toBe('');
    vi.stubEnv('NODE_ENV', env ?? 'test');
  });

  it('should render null when disabled', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<AxeValidator disabled />);
    expect(container.innerHTML).toBe('');
    vi.stubEnv('NODE_ENV', 'test');
  });

  it('should render hidden div in dev mode', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { container } = render(<AxeValidator />);
    const div = container.querySelector('[data-testid="axe-validator"]');
    expect(div).toBeTruthy();
    expect(div!.getAttribute('aria-hidden')).toBe('true');
    vi.stubEnv('NODE_ENV', 'test');
  });
});
