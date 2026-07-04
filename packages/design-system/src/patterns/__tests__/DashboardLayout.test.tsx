import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from '../DashboardLayout.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('DashboardLayout', () => {
  it('renders children', () => {
    render(
      <DashboardLayout>
        <div data-testid="content">Content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders header when provided', () => {
    render(
      <DashboardLayout header={<header data-testid="header">Header</header>}>
        <div>Content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <DashboardLayout sidebar={<nav data-testid="sidebar">Side</nav>}>
        <div>Content</div>
      </DashboardLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<DashboardLayout>Content</DashboardLayout>);
  });
});
