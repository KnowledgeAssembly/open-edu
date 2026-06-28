import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Popover, PopoverTrigger, PopoverContent } from '../popover.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('Popover', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
  });
  it('renders trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText('Open')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(PopoverTrigger.displayName).toBe('PopoverTrigger');
    expect(PopoverContent.displayName).toBe('PopoverContent');
  });
});
