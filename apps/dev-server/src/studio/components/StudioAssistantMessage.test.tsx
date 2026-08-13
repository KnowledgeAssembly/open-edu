import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioAssistantMessage } from './StudioAssistantMessage';

function wrap(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>,
  );
}

describe('StudioAssistantMessage', () => {
  it('renders assistant text', () => {
    wrap(<StudioAssistantMessage role="assistant" content="Here's a draft." />);
    expect(screen.getByText("Here's a draft.")).toBeInTheDocument();
  });

  it('renders next-step chips and fires onSelectNextStep', async () => {
    const onSelect = vi.fn();
    wrap(
      <StudioAssistantMessage
        role="assistant"
        content="Done."
        metadata={{ mode: 'draft', suggestedNextSteps: ['Apply this draft', 'Add a quiz'] }}
        onSelectNextStep={onSelect}
      />,
    );
    const chip = screen.getByRole('button', { name: 'Apply this draft' });
    expect(chip).toBeInTheDocument();
    await userEvent.click(chip);
    expect(onSelect).toHaveBeenCalledWith('Apply this draft');
  });

  it('does not render chips when none suggested', () => {
    wrap(
      <StudioAssistantMessage role="assistant" content="Done." metadata={{ mode: 'explain' }} />,
    );
    expect(screen.queryByText('Suggested next steps')).not.toBeInTheDocument();
  });
});
