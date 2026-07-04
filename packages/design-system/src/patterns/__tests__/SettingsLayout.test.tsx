import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsLayout } from '../SettingsLayout.js';
import { checkAccessibility } from '@open-edu/design-system/test-utils';

describe('SettingsLayout', () => {
  it('renders children', () => {
    render(
      <SettingsLayout>
        <div data-testid="content">Content</div>
      </SettingsLayout>,
    );
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders sidebar when provided', () => {
    render(
      <SettingsLayout sidebar={<nav data-testid="sidebar">Side</nav>}>
        <div>Content</div>
      </SettingsLayout>,
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(<SettingsLayout>Content</SettingsLayout>);
  });
});
