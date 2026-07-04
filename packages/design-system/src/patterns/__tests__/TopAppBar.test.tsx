import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopAppBar } from '../TopAppBar.js';
import { FontSizeProvider } from '../../font-size-context.js';
import { checkAccessibility } from '../../test-utils/a11y.js';

function renderWithProvider(ui: React.ReactElement) {
  return render(<FontSizeProvider>{ui}</FontSizeProvider>);
}

describe('TopAppBar', () => {
  it('renders breadcrumbs when provided', () => {
    renderWithProvider(
      <TopAppBar breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Courses' }]} />,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('renders user avatar placeholder when no avatar provided', () => {
    renderWithProvider(<TopAppBar />);
    expect(screen.getByTestId('top-appbar-avatar')).toBeInTheDocument();
  });

  it('shows a11y controls toggle when showA11yControls is true', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    expect(screen.getByTestId('top-appbar-a11y')).toBeInTheDocument();
  });

  it('a11y controls button has correct aria-label and title', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    const btn = screen.getByTestId('top-appbar-a11y');
    expect(btn.getAttribute('aria-label')).toBe('Accessibility settings');
    expect(btn.getAttribute('title')).toBe('Accessibility settings');
  });

  it('a11y controls panel opens on click', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel')).toBeInTheDocument();
  });

  it('a11y panel has role="region"', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel').getAttribute('role')).toBe('region');
  });

  it('renders as header element', () => {
    renderWithProvider(<TopAppBar />);
    expect(screen.getByTestId('top-app-bar').tagName).toBe('HEADER');
  });

  it('Escape key closes a11y panel', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('top-appbar-a11y-panel')).toBeNull();
  });

  it('font size increase button updates display', () => {
    renderWithProvider(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    const display = screen.getByText('100%');
    expect(display).toBeInTheDocument();
    const increaseBtn = screen.getByLabelText('Increase font size');
    fireEvent.click(increaseBtn);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });

  it('renders course title and mini progress bar in course view', () => {
    renderWithProvider(
      <TopAppBar
        isCourseView
        courseTitle="My Course"
        progressCurrent={3}
        progressTotal={10}
        showA11yControls
      />,
    );
    expect(screen.getByText('My Course')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not render breadcrumbs in course view', () => {
    renderWithProvider(<TopAppBar isCourseView breadcrumbs={[{ label: 'Home' }]} />);
    expect(screen.queryByText('Home')).toBeNull();
  });

  it('renders progressbar with correct aria values', () => {
    renderWithProvider(<TopAppBar isCourseView progressCurrent={3} progressTotal={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('3');
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
  });

  it('has no accessibility violations', async () => {
    await checkAccessibility(
      <FontSizeProvider>
        <TopAppBar />
      </FontSizeProvider>,
    );
  });
});
