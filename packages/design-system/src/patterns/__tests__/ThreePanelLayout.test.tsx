import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThreePanelLayout } from '../ThreePanelLayout.js';

describe('ThreePanelLayout', () => {
  it('renders content', () => {
    render(<ThreePanelLayout content={<div data-testid="content">Content</div>} />);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders leftNav when provided', () => {
    render(
      <ThreePanelLayout
        leftNav={<nav data-testid="leftnav">Nav</nav>}
        content={<div>Content</div>}
      />,
    );
    expect(screen.getByTestId('leftnav')).toBeInTheDocument();
  });

  it('renders rightPanel when provided', () => {
    render(
      <ThreePanelLayout
        content={<div>Content</div>}
        rightPanel={<aside data-testid="rightpanel">Panel</aside>}
      />,
    );
    expect(screen.getByTestId('rightpanel')).toBeInTheDocument();
  });
});
