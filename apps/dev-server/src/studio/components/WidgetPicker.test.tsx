import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { WidgetPicker } from './WidgetPicker';
import type { CuratedWidget } from '../widgets/curatedCatalog.js';

const { mockWidgets } = vi.hoisted(() => ({
  mockWidgets: [
    {
      id: 'core.multiple-choice',
      name: 'Multiple Choice',
      description: 'Select the correct answer from a list of options',
      domain: 'core',
    },
    { id: 'core.matching', name: 'Matching', description: 'Match pairs of items', domain: 'core' },
    {
      id: 'math.fraction-visual',
      name: 'Fraction Visual',
      description: 'Visualize fractions as shapes',
      domain: 'math',
    },
  ] as CuratedWidget[],
}));

vi.mock('../widgets/curatedCatalog.js', () => ({
  listCuratedWidgets: () => mockWidgets,
  getCuratedWidget: () => undefined,
}));

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

function renderPicker(onSelect: (widget: CuratedWidget) => void = () => {}) {
  render(wrap(<WidgetPicker open onOpenChange={() => {}} onSelect={onSelect} />));
}

describe('WidgetPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the curated widgets', () => {
    renderPicker();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('Matching')).toBeInTheDocument();
    expect(screen.getByText('Fraction Visual')).toBeInTheDocument();
  });

  it('shows a domain badge for each widget', () => {
    renderPicker();
    expect(screen.getAllByText('core').length).toBe(2);
    expect(screen.getByText('math')).toBeInTheDocument();
  });

  it('filters widgets by search query', async () => {
    renderPicker();
    await userEvent.type(screen.getByRole('textbox', { name: /search practices/i }), 'fraction');
    expect(screen.getByText('Fraction Visual')).toBeInTheDocument();
    expect(screen.queryByText('Multiple Choice')).not.toBeInTheDocument();
    expect(screen.queryByText('Matching')).not.toBeInTheDocument();
  });

  it('shows a no-results message when nothing matches', async () => {
    renderPicker();
    await userEvent.type(screen.getByRole('textbox', { name: /search practices/i }), 'zzz');
    expect(screen.getByText('No practices match your search.')).toBeInTheDocument();
  });

  it('calls onSelect with the widget and closes on Use this practice', async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    render(wrap(<WidgetPicker open onOpenChange={onOpenChange} onSelect={onSelect} />));
    const cards = screen.getAllByRole('button', { name: /use this practice/i });
    await userEvent.click(cards[1]!);
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'core.matching', name: 'Matching' }),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
