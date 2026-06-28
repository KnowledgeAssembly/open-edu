import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select.jsx';

describe('Select', () => {
  it('renders trigger with value', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText('Select option')).toBeDefined();
  });

  it('sets displayName', () => {
    expect(SelectTrigger.displayName).toBe('SelectTrigger');
    expect(SelectContent.displayName).toBe('SelectContent');
  });
});
