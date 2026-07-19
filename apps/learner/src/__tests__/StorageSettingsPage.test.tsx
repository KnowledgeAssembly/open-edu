import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageSettingsPage } from '../pages/StorageSettingsPage.js';

describe('StorageSettingsPage', () => {
  it('renders storage management UI', () => {
    render(<StorageSettingsPage />);
    expect(screen.getByText(/Storage Settings/i)).toBeInTheDocument();
  });
});
