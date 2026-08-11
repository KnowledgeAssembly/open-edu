import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioChrome } from './StudioChrome';
import type { StudioMode, StudioView } from '../types.js';

(globalThis as { axe?: typeof axe }).axe = axe;

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function renderChrome(props: {
  mode?: StudioMode;
  view?: StudioView;
  courseTitle?: string;
  minimal?: boolean;
  activityLabel?: string;
}) {
  const onModeChange = vi.fn();
  const onNavigate = vi.fn();
  return {
    onModeChange,
    onNavigate,
    ...render(
      wrap(
        <StudioChrome
          mode={props.mode ?? 'creator'}
          onModeChange={onModeChange}
          onNavigate={onNavigate}
          courseTitle={props.courseTitle}
          view={props.view ?? 'home'}
          minimal={props.minimal}
          activityLabel={props.activityLabel}
        />,
      ),
    ),
  };
}

describe('StudioChrome', () => {
  it('renders brand text OpenEdu Studio', () => {
    renderChrome({});
    expect(screen.getByText('OpenEdu Studio')).toBeInTheDocument();
  });

  it('shows active aria-current on matching nav item', () => {
    renderChrome({ view: 'outline', courseTitle: 'Test' });
    const outlineBtn = screen.getByRole('button', { name: /outline/i });
    expect(outlineBtn).toHaveAttribute('aria-current', 'page');
  });

  it('disables course-required nav when no courseTitle', () => {
    renderChrome({ view: 'home', courseTitle: undefined });
    const outlineBtn = screen.getByRole('button', { name: /outline/i });
    expect(outlineBtn).toBeDisabled();
  });

  it('disables the Share CTA when no courseTitle', () => {
    renderChrome({ view: 'home', courseTitle: undefined });
    const shareBtn = screen.getByRole('button', { name: /share/i });
    expect(shareBtn).toBeDisabled();
  });

  it('calls onNavigate on Share click', async () => {
    const { onNavigate } = renderChrome({ courseTitle: 'Test' });
    await userEvent.click(screen.getByRole('button', { name: /share/i }));
    expect(onNavigate).toHaveBeenCalledWith('share');
  });

  it('calls onModeChange on mode toggle', async () => {
    const { onModeChange } = renderChrome({});
    const header = screen.getByRole('banner');
    const toggle = within(header).getByRole('switch', { name: /studio mode/i });
    await userEvent.click(toggle);
    expect(onModeChange).toHaveBeenCalledWith('developer');
  });

  it('hides nav when minimal', () => {
    renderChrome({ minimal: true, courseTitle: 'Test' });
    expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /outline/i })).not.toBeInTheDocument();
  });

  it('renders breadcrumbs when not on home', () => {
    renderChrome({ view: 'outline', courseTitle: 'Test Course' });
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    const outlineElements = screen.getAllByText('Outline');
    expect(outlineElements.length).toBeGreaterThanOrEqual(1);
  });

  it('is accessible', async () => {
    const { container } = renderChrome({ view: 'outline', courseTitle: 'Test' });
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });

  it('offers the mode toggle inside the mobile overflow menu', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderChrome({ mode: 'creator', onModeChange });
    await user.click(screen.getByRole('button', { name: /more/i }));
    const menu = await screen.findByRole('menu');
    const toggle = within(menu).getByRole('switch');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
    expect(within(menu).getByText('Creator')).toBeInTheDocument();
    expect(within(menu).getByText('Developer')).toBeInTheDocument();
  });
});
