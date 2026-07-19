import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '../components/OfflineBanner.js';

describe('OfflineBanner', () => {
  it('shows banner when offline', () => {
    render(<OfflineBanner isOnline={false} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });

  it('does not show banner when online', () => {
    const { container } = render(<OfflineBanner isOnline={true} />);
    expect(container.firstChild).toBeNull();
  });
});
