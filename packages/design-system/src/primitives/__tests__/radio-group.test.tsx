import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadioGroup, RadioGroupItem } from '../radio-group.jsx';
import { checkAccessibility } from '../../test-utils/a11y.jsx';

describe('RadioGroup', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <RadioGroup>
        <RadioGroupItem value="1" aria-label="Option 1" />
      </RadioGroup>,
    );
  });
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
