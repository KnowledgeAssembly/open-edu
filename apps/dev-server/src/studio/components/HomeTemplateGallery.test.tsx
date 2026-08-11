import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { HomeTemplateGallery } from './HomeTemplateGallery';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('HomeTemplateGallery', () => {
  it('renders all studio templates', () => {
    render(wrap(<HomeTemplateGallery selectedId={null} onSelect={() => {}} onApply={() => {}} />));
    expect(screen.getByText('Reading lesson')).toBeInTheDocument();
    expect(screen.getByText('Lesson + quiz')).toBeInTheDocument();
    expect(screen.getByText('Practice warm-up')).toBeInTheDocument();
    expect(screen.getByText('Short unit')).toBeInTheDocument();
  });

  it('selects a template card via aria-pressed', async () => {
    const onSelect = vi.fn();
    render(wrap(<HomeTemplateGallery selectedId={null} onSelect={onSelect} onApply={() => {}} />));
    const card = screen.getByRole('button', { name: /reading lesson/i });
    expect(card).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith('reading-lesson');
  });

  it('keeps Use template disabled until a template is selected', () => {
    render(wrap(<HomeTemplateGallery selectedId={null} onSelect={() => {}} onApply={() => {}} />));
    expect(screen.getByRole('button', { name: /use template/i })).toBeDisabled();
  });

  it('enables Use template when selected and applies via callback', async () => {
    const onApply = vi.fn();
    render(
      wrap(
        <HomeTemplateGallery selectedId="reading-lesson" onSelect={() => {}} onApply={onApply} />,
      ),
    );
    const useButton = screen.getByRole('button', { name: /use template/i });
    expect(useButton).toBeEnabled();
    await userEvent.click(useButton);
    expect(onApply).toHaveBeenCalledWith('reading-lesson');
  });

  it('marks the selected template with the settle transition and elevation', () => {
    const { container } = render(
      wrap(
        <HomeTemplateGallery selectedId="reading-lesson" onSelect={() => {}} onApply={() => {}} />,
      ),
    );
    const card = container.querySelector('button');
    expect(card?.className).toContain('studio-select-settle');
    expect(card?.className).toContain('shadow-raised');
  });
});
