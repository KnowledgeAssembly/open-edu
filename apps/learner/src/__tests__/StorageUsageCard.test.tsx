import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StorageUsageCard } from '../components/StorageUsageCard.js';

describe('StorageUsageCard', () => {
  it('displays storage usage', () => {
    render(<StorageUsageCard usage={5000} quota={100000} />);
    expect(screen.getByText(/storage/i)).toBeInTheDocument();
  });
});
