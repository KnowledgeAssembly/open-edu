import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLayout } from '../AppLayout.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('AppLayout', () => {
  it('renders children', () => {
    render(
      <AppLayout>
        <div data-testid="content">Content</div>
      </AppLayout>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders topBar when provided', () => {
    render(
      <AppLayout topBar={<div data-testid="topbar">Top</div>}>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByTestId('topbar')).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <AppLayout sidebar={<nav data-testid="sidebar">Side</nav>}>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<AppLayout>Content</AppLayout>);
  });
});
