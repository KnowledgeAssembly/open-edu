import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tag } from '../tag.jsx';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('Tag', () => {
  it('has no accessibility violations', async () => {
    await checkAccessibility(<Tag>Tag</Tag>);
  });
  it('renders with text', () => {
    render(<Tag>React</Tag>);
    expect(screen.getByText('React')).toBeDefined();
  });

  it('renders remove button when onRemove provided', () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Tag</Tag>);
    const removeBtn = screen.getByLabelText('Remove');
    expect(removeBtn).toBeDefined();
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalled();
  });

  it('does not render remove button without onRemove', () => {
    render(<Tag>Tag</Tag>);
    expect(screen.queryByLabelText('Remove')).toBeNull();
  });

  it('sets displayName', () => {
    expect(Tag.displayName).toBe('Tag');
  });
});
