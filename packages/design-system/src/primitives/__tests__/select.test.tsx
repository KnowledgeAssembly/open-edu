import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../select.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

describe('Select', () => {
  it('has no accessibility violations in closed state', async () => {
    await checkAccessibility(
      <Select>
        <SelectTrigger aria-label="Select an option">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
        </SelectContent>
      </Select>,
    );
  });

  it('has no accessibility violations in open state', async () => {
    await checkAccessibility(
      <Select defaultOpen>
        <SelectTrigger aria-label="Select an option">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Option 1</SelectItem>
          <SelectItem value="2">Option 2</SelectItem>
        </SelectContent>
      </Select>,
    );
  });
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
