import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { OutlineActivityRow } from './OutlineActivityRow';
import type { ActivitySummary } from '../types.js';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const fixture: ActivitySummary = {
  id: 'nodes/a.md',
  path: 'nodes/a.md',
  title: 'Intro',
  kind: 'lesson',
};

function renderRow(
  overrides: {
    activity?: ActivitySummary;
    index?: number;
    total?: number;
    saving?: boolean;
    onEdit?: (path: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDelete?: () => void;
  } = {},
) {
  const onEdit = overrides.onEdit ?? vi.fn();
  const onMoveUp = overrides.onMoveUp ?? vi.fn();
  const onMoveDown = overrides.onMoveDown ?? vi.fn();
  const onDelete = overrides.onDelete ?? vi.fn();
  render(
    wrap(
      <ul>
        <OutlineActivityRow
          activity={overrides.activity ?? fixture}
          index={overrides.index ?? 0}
          total={overrides.total ?? 2}
          saving={overrides.saving ?? false}
          onEdit={onEdit}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDelete={onDelete}
        />
      </ul>,
    ),
  );
  return { onEdit, onMoveUp, onMoveDown, onDelete };
}

describe('OutlineActivityRow', () => {
  it('renders the title, the kind badge "Lesson", and a menu trigger with aria-label containing "Intro"', () => {
    renderRow();
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Lesson')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /activity actions for intro/i })).toBeInTheDocument();
  });

  it('clicking the title button calls onEdit', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderRow();
    await user.click(screen.getByRole('button', { name: 'Intro' }));
    expect(onEdit).toHaveBeenCalledWith('nodes/a.md');
  });

  it('opens the menu and clicking Edit calls onEdit', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderRow();
    await user.click(screen.getByRole('button', { name: /activity actions for intro/i }));
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith('nodes/a.md');
  });

  it('Move up is disabled when index is 0', async () => {
    const user = userEvent.setup();
    renderRow({ index: 0 });
    await user.click(screen.getByRole('button', { name: /activity actions for intro/i }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /move intro up/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('Move down is disabled when index is total - 1', async () => {
    const user = userEvent.setup();
    renderRow({ index: 1, total: 2 });
    await user.click(screen.getByRole('button', { name: /activity actions for intro/i }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /move intro down/i })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('clicking Delete calls onDelete once', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderRow();
    await user.click(screen.getByRole('button', { name: /activity actions for intro/i }));
    const menu = await screen.findByRole('menu');
    await user.click(within(menu).getByRole('menuitem', { name: /delete intro/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
