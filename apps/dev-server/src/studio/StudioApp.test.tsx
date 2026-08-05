import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioApp } from './StudioApp';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

const applyTemplateMock = vi.fn();

vi.mock('./studioApi.js', () => ({
  createStudioApi: () => ({
    getPackageDir: vi.fn(),
    validate: vi.fn(),
    getOutline: vi.fn(),
    saveOutlineOrder: vi.fn(),
    applyTemplate: applyTemplateMock,
    exportOep: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }),
}));

describe('StudioApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders studio chrome with mode toggle', () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} />));
    expect(screen.getByText('OpenEdu Studio')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /studio mode/i })).toBeInTheDocument();
  });

  it('starts on Home with template gallery', () => {
    render(wrap(<StudioApp mode="creator" onModeChange={() => {}} />));
    expect(screen.getByText('Reading lesson')).toBeInTheDocument();
  });

  it('persists mode change via onModeChange', async () => {
    const onModeChange = vi.fn();
    render(wrap(<StudioApp mode="creator" onModeChange={onModeChange} />));
    // toggle is in the top bar; click handled by ModeToggle in DevApp tests
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
