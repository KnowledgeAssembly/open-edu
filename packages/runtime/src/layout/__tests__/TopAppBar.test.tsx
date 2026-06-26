import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopAppBar } from '../TopAppBar.js';

describe('TopAppBar', () => {
  it('renders breadcrumbs when provided', () => {
    render(<TopAppBar breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Courses' }]} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('renders Ask AI button', () => {
    render(<TopAppBar />);
    expect(screen.getByTestId('top-appbar-ask-ai')).toBeInTheDocument();
  });

  it('renders Search button', () => {
    render(<TopAppBar />);
    expect(screen.getByTestId('top-appbar-search')).toBeInTheDocument();
  });

  it('renders user avatar placeholder when no avatar provided', () => {
    render(<TopAppBar />);
    expect(screen.getByTestId('top-appbar-avatar')).toBeInTheDocument();
  });

  it('calls onSearchClick when search clicked', () => {
    const onSearchClick = vi.fn();
    render(<TopAppBar onSearchClick={onSearchClick} />);
    fireEvent.click(screen.getByTestId('top-appbar-search'));
    expect(onSearchClick).toHaveBeenCalled();
  });

  it('calls onAskAiClick when Ask AI clicked', () => {
    const onAskAiClick = vi.fn();
    render(<TopAppBar onAskAiClick={onAskAiClick} />);
    fireEvent.click(screen.getByTestId('top-appbar-ask-ai'));
    expect(onAskAiClick).toHaveBeenCalled();
  });

  it('renders ThemeSelector when currentThemeId and onThemeChange provided', () => {
    const onThemeChange = vi.fn();
    render(<TopAppBar currentThemeId="lumina-scholastica" onThemeChange={onThemeChange} />);
    expect(screen.getByTestId('theme-selector-trigger')).toBeInTheDocument();
  });

  it('shows a11y controls toggle when showA11yControls is true', () => {
    render(<TopAppBar showA11yControls />);
    expect(screen.getByTestId('top-appbar-a11y')).toBeInTheDocument();
  });

  it('a11y controls panel opens on click', () => {
    render(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel')).toBeInTheDocument();
  });

  it('a11y panel has role="dialog"', () => {
    render(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel').getAttribute('role')).toBe('dialog');
  });

  it('has role="banner"', () => {
    render(<TopAppBar />);
    expect(screen.getByTestId('top-app-bar').getAttribute('role')).toBe('banner');
  });

  it('Escape key closes a11y panel', () => {
    render(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    expect(screen.getByTestId('top-appbar-a11y-panel')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('top-appbar-a11y-panel')).toBeNull();
  });

  it('font size increase button updates display', () => {
    render(<TopAppBar showA11yControls />);
    fireEvent.click(screen.getByTestId('top-appbar-a11y'));
    const display = screen.getByText('100%');
    expect(display).toBeInTheDocument();
    const increaseBtn = screen.getByLabelText('Increase font size');
    fireEvent.click(increaseBtn);
    expect(screen.getByText('110%')).toBeInTheDocument();
  });
});
