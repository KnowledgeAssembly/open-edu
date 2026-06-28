import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadioGroup, RadioGroupItem } from '../radio-group.jsx';

describe('RadioGroup', () => {
  it('renders radio items', () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" />
        <RadioGroupItem value="b" />
      </RadioGroup>,
    );
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('sets displayName', () => {
    expect(RadioGroup.displayName).toBe('RadioGroup');
    expect(RadioGroupItem.displayName).toBe('RadioGroupItem');
  });
});
