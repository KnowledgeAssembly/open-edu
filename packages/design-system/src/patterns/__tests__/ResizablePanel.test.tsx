import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResizablePanel } from '../ResizablePanel.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('ResizablePanel', () => {
  it('renders left and right panels', () => {
    render(
      <ResizablePanel
        left={<div data-testid="left-pane">Left</div>}
        right={<div data-testid="right-pane">Right</div>}
      />,
    );
    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.getByTestId('right-pane')).toBeInTheDocument();
  });

  it('renders a divider with drag handle', () => {
    render(<ResizablePanel left={<div>Left</div>} right={<div>Right</div>} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('hides right panel when collapsed', () => {
    render(
      <ResizablePanel
        left={<div data-testid="left-pane">Left</div>}
        right={<div data-testid="right-pane">Right</div>}
        collapsed={true}
      />,
    );
    expect(screen.getByTestId('left-pane')).toBeInTheDocument();
    expect(screen.queryByTestId('right-pane-container')).not.toBeInTheDocument();
  });

  it('applies minLeftPct when set', () => {
    render(
      <ResizablePanel
        left={<div>Left</div>}
        right={<div>Right</div>}
        minLeftPct={30}
        defaultRatio={0.2}
      />,
    );
    const leftContainer = screen.getByTestId('resizable-left');
    expect(leftContainer).toHaveStyle({ minWidth: '30%' });
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<ResizablePanel left={<div>Left</div>} right={<div>Right</div>} />);
  });
});
