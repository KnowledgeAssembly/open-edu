import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseViewerLayout } from '../CourseViewerLayout.js';
import { checkAccessibility } from '../../test-utils/a11y.js';

describe('CourseViewerLayout', () => {
  it('renders content', () => {
    render(<CourseViewerLayout content={<div data-testid="content">Content</div>} />);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders topBar when provided', () => {
    render(
      <CourseViewerLayout
        topBar={<header data-testid="topbar">Top</header>}
        content={<div>Content</div>}
      />,
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders sideNav when provided', () => {
    render(
      <CourseViewerLayout
        sideNav={<nav data-testid="sidenav">Nav</nav>}
        content={<div>Content</div>}
      />,
    );
    expect(screen.getByTestId('sidenav')).toBeInTheDocument();
  });

  it('renders rightPanel when provided', () => {
    render(
      <CourseViewerLayout
        content={<div>Content</div>}
        rightPanel={<aside data-testid="rightpanel">Panel</aside>}
      />,
    );
    expect(screen.getByTestId('rightpanel')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<CourseViewerLayout content={<div>Content</div>} />);
  });
});
