import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitView } from '../SplitView.js';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('SplitView', () => {
  it('renders left and right panels', () => {
    render(
      <SplitView
        left={<div data-testid="left">Left</div>}
        right={<div data-testid="right">Right</div>}
      />,
    );
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<SplitView left={<div>Left</div>} right={<div>Right</div>} />);
  });
});
