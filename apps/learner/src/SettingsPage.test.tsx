import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { FontSizeProvider } from '@open-edu/design-system';

function renderWithProvider(ui: React.ReactElement) {
  return render(<FontSizeProvider>{ui}</FontSizeProvider>);
}

describe('SettingsPage', () => {
  it('renders the theme section', () => {
    renderWithProvider(<SettingsPage currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
  });

  it('renders accessibility controls', () => {
    renderWithProvider(<SettingsPage currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
    expect(screen.getByText('High Contrast')).toBeInTheDocument();
  });

  it('calls onThemeChange when theme is selected', () => {
    const onThemeChange = vi.fn();
    renderWithProvider(<SettingsPage currentThemeId="lumina-scholastica" onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    fireEvent.click(screen.getByTestId('theme-card-high-focus'));
    expect(onThemeChange).toHaveBeenCalledWith('high-focus');
  });
});
