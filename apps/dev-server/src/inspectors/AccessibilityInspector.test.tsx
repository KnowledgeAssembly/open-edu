import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibilityInspector } from './AccessibilityInspector';

vi.mock('axe-core', () => ({
  default: {
    run: vi.fn().mockResolvedValue({ violations: [] }),
  },
}));

describe('AccessibilityInspector', () => {
  it('should render the audit button after initial load', async () => {
    render(<AccessibilityInspector />);
    expect(await screen.findByText('Run Audit', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('should show no violations message after audit', async () => {
    render(<AccessibilityInspector />);
    expect(await screen.findByText(/No accessibility violations found/)).toBeInTheDocument();
  });
});
