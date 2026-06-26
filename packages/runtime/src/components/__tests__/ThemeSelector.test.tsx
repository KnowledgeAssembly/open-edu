import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSelector } from '../ThemeSelector.js';

const themes = ['high-focus', 'lumina-scholastica', 'nocturnal', 'sylvan-workspace'] as const;

describe('ThemeSelector', () => {
  it('renders trigger button', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    expect(screen.getByTestId('theme-selector-trigger')).toBeInTheDocument();
  });

  it('popover is closed by default', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    expect(screen.queryByTestId('theme-selector-popover')).toBeNull();
  });

  it('clicking trigger opens popover', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    expect(screen.getByTestId('theme-selector-popover')).toBeInTheDocument();
  });

  it('renders all 4 theme cards', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));

    for (const id of themes) {
      expect(screen.getByTestId(`theme-card-${id}`)).toBeInTheDocument();
    }
  });

  it('selecting a theme calls onThemeChange', () => {
    const onThemeChange = vi.fn();
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={onThemeChange} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    fireEvent.click(screen.getByTestId('theme-card-high-focus'));
    expect(onThemeChange).toHaveBeenCalledWith('high-focus');
  });

  it('closes popover after selecting a theme', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    expect(screen.getByTestId('theme-selector-popover')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('theme-card-high-focus'));
    expect(screen.queryByTestId('theme-selector-popover')).toBeNull();
  });

  it('closes popover on Escape key', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    expect(screen.getByTestId('theme-selector-popover')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByTestId('theme-selector-popover'), { key: 'Escape' });
    expect(screen.queryByTestId('theme-selector-popover')).toBeNull();
  });

  it('marks current theme as selected', () => {
    render(<ThemeSelector currentThemeId="nocturnal" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));

    const selectedCard = screen.getByTestId('theme-card-nocturnal');
    expect(selectedCard.getAttribute('aria-selected')).toBe('true');
  });

  it('trigger has correct ARIA attributes', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    const trigger = screen.getByTestId('theme-selector-trigger');
    expect(trigger.getAttribute('aria-label')).toBe('Select theme');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('sets aria-expanded to true when open', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    expect(screen.getByTestId('theme-selector-trigger').getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking trigger toggles popover', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    const trigger = screen.getByTestId('theme-selector-trigger');

    fireEvent.click(trigger);
    expect(screen.getByTestId('theme-selector-popover')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByTestId('theme-selector-popover')).toBeNull();
  });

  it('closes on click outside', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));
    expect(screen.getByTestId('theme-selector-popover')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByTestId('theme-selector-popover')).toBeNull();
  });

  it('popover has role="dialog" and aria-label', () => {
    render(<ThemeSelector currentThemeId="lumina-scholastica" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));

    const popover = screen.getByTestId('theme-selector-popover');
    expect(popover.getAttribute('role')).toBe('dialog');
    expect(popover.getAttribute('aria-label')).toBe('Theme selector');
  });

  it('cards have role="option" and aria-selected reflects currentThemeId', () => {
    render(<ThemeSelector currentThemeId="high-focus" onThemeChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId('theme-selector-trigger'));

    const selected = screen.getByTestId('theme-card-high-focus');
    expect(selected.getAttribute('role')).toBe('option');
    expect(selected.getAttribute('aria-selected')).toBe('true');

    const unselected = screen.getByTestId('theme-card-nocturnal');
    expect(unselected.getAttribute('aria-selected')).toBe('false');
  });
});
