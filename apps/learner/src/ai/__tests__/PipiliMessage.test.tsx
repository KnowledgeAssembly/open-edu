import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { PipiliMessage } from '../PipiliMessage.js';
import { CompanionProvider } from '../CompanionProvider.js';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
      <CompanionProvider>{ui}</CompanionProvider>
    </I18nProvider>,
  );
}

describe('PipiliMessage', () => {
  const textParts = (text: string): Array<{ type: 'text'; text: string }> => [
    { type: 'text', text },
  ];

  it('renders user message text parts', () => {
    renderWithI18n(<PipiliMessage role="user" parts={textParts('Hello user')} />);
    expect(screen.getByText('Hello user')).toBeInTheDocument();
  });

  it('renders assistant message text parts', () => {
    renderWithI18n(<PipiliMessage role="assistant" parts={textParts('Hello assistant')} />);
    expect(screen.getByText('Hello assistant')).toBeInTheDocument();
  });

  it('shows streaming caret when isStreaming is true', () => {
    const { container } = renderWithI18n(
      <PipiliMessage role="assistant" parts={textParts('Streaming')} isStreaming />,
    );
    const caret = container.querySelector('.animate-pulse');
    expect(caret).toBeInTheDocument();
  });

  it('does not show caret when isStreaming is false', () => {
    const { container } = renderWithI18n(
      <PipiliMessage role="assistant" parts={textParts('Done')} isStreaming={false} />,
    );
    const caret = container.querySelector('.animate-pulse');
    expect(caret).not.toBeInTheDocument();
  });

  it('renders citations when metadata.citations provided', () => {
    renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('Response with citation')}
        metadata={{
          mode: 'tutor',
          citations: [{ source: 'lesson-1', text: 'Cited text', type: 'lesson' }],
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-citations')).toBeInTheDocument();
  });

  it('renders nothing for citations when metadata.citations is empty', () => {
    renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('Response')}
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.queryByTestId('pipili-citations')).not.toBeInTheDocument();
  });

  it('renders hint level indicator when metadata.hintLevel is set', () => {
    renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('Hint response')}
        metadata={{
          mode: 'coach',
          citations: [],
          hintLevel: 2,
          assessmentSafe: true,
          suggestedNextSteps: [],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-hint-level')).toBeInTheDocument();
    expect(screen.getByTestId('pipili-hint-level').textContent).toContain('2');
  });

  it('renders suggested next steps when provided', () => {
    renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('Try the next exercise')}
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: ['Try the next exercise'],
        }}
      />,
    );
    expect(screen.getByTestId('pipili-next-steps')).toBeInTheDocument();
  });

  it('does not render next steps during streaming', () => {
    renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('Streaming...')}
        isStreaming
        metadata={{
          mode: 'tutor',
          citations: [],
          assessmentSafe: true,
          suggestedNextSteps: ['Try again'],
        }}
      />,
    );
    expect(screen.queryByTestId('pipili-next-steps')).not.toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderWithI18n(
      <PipiliMessage
        role="assistant"
        parts={textParts('An accessible assistant message')}
        metadata={{
          mode: 'coach',
          citations: [{ source: 'lesson', text: 'ref', type: 'lesson' }],
          hintLevel: 1,
          assessmentSafe: true,
          suggestedNextSteps: ['Next step'],
        }}
      />,
    );
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('renders OpenMoji SVG images for assistant text in OpenMoji mode', () => {
    localStorage.setItem('oe-emoji-pack', 'openmoji');
    renderWithI18n(<PipiliMessage role="assistant" parts={textParts('Great job 🌟')} />);
    const img = screen.getByAltText('🌟');
    expect(img).toHaveAttribute(
      'src',
      'https://cdn.jsdelivr.net/npm/openmoji-static@15.0.0/single_svg/1F31F.svg',
    );
    localStorage.removeItem('oe-emoji-pack');
  });

  it('keeps native emoji text for assistant text in Native mode', () => {
    localStorage.setItem('oe-emoji-pack', 'native');
    renderWithI18n(<PipiliMessage role="assistant" parts={textParts('Great job 🌟')} />);
    expect(screen.getByText('Great job 🌟')).toBeInTheDocument();
    localStorage.removeItem('oe-emoji-pack');
  });
});
