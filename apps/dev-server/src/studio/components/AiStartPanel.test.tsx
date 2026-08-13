import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AiStartPanel } from './AiStartPanel';
import { StudioAssistantProvider } from '../ai/StudioAssistantProvider';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      <StudioAssistantProvider>
        {ui}
      </StudioAssistantProvider>
    </I18nProvider>
  );
}

describe('AiStartPanel', () => {
  it('renders the heading and lede', async () => {
    render(wrap(<AiStartPanel />));
    expect(await screen.findByText('Or start with AI')).toBeInTheDocument();
    expect(screen.getByText(/Paste your notes or lesson outline/)).toBeInTheDocument();
  });

  it('renders a CTA button to open the assistant', async () => {
    render(wrap(<AiStartPanel />));
    expect(screen.getByRole('button', { name: /open author assistant/i })).toBeInTheDocument();
  });

  it('renders an upload course spec control', async () => {
    render(wrap(<AiStartPanel />));
    expect(screen.getByRole('button', { name: /upload spec/i })).toBeInTheDocument();
  });
});
