import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { EditorCoachingPanel } from './EditorCoachingPanel';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('EditorCoachingPanel', () => {
  it('renders each check label and shows CheckCircle2 icon for passed items', () => {
    const { container } = render(
      wrap(
        <EditorCoachingPanel
          checks={[
            { id: 'a', passed: true, label: 'Has heading' },
            { id: 'b', passed: false, label: 'Needs work' },
          ]}
          tips={[]}
        />,
      ),
    );
    expect(screen.getByText('Has heading')).toBeInTheDocument();
    expect(screen.getByText('Needs work')).toBeInTheDocument();
    expect(container.querySelector('svg.text-success')).toBeInTheDocument();
  });

  it('renders tips when provided and hides tips heading when empty', () => {
    const { rerender } = render(
      wrap(<EditorCoachingPanel checks={[]} tips={['Tip one', 'Tip two']} />),
    );
    expect(screen.getByText('Tips')).toBeInTheDocument();
    expect(screen.getByText('Tip one')).toBeInTheDocument();
    expect(screen.getByText('Tip two')).toBeInTheDocument();

    rerender(wrap(<EditorCoachingPanel checks={[]} tips={[]} />));
    expect(screen.queryByText('Tips')).not.toBeInTheDocument();
  });

  it('has no role="switch" or buttons — purely informational', () => {
    render(
      wrap(<EditorCoachingPanel checks={[{ id: 'a', passed: true, label: 'Check' }]} tips={[]} />),
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
