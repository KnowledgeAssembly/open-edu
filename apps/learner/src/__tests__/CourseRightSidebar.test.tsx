import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CourseRightSidebar } from '../CourseRightSidebar';
import { CompanionProvider } from '../ai';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';
import notesDict from '@open-edu/i18n/locales/en/notes.json';

vi.mock('@open-edu/runtime', () => ({
  RuntimeThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRuntimeOptional: () => null,
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict, notes: notesDict } }}>
      <CompanionProvider>{ui}</CompanionProvider>
    </I18nProvider>,
  );
}

describe('CourseRightSidebar', () => {
  it('renders collapsed sidebar with open button when panel is closed', () => {
    renderWithProvider(<CourseRightSidebar />);
    const openBtn = screen.getByRole('button', { name: /open sidebar/i });
    expect(openBtn).toBeInTheDocument();
  });

  it('renders expanded sidebar with tabs when panel is open', () => {
    renderWithProvider(<CourseRightSidebar />);
    const openBtn = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(openBtn);

    expect(screen.getByRole('tab', { name: /pipili/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /notepad/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close sidebar/i })).toBeInTheDocument();
  });

  it('has proper ARIA tablist pattern', () => {
    renderWithProvider(<CourseRightSidebar />);
    const openBtn = screen.getByRole('button', { name: /open sidebar/i });
    fireEvent.click(openBtn);

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const pipiliTab = screen.getByRole('tab', { name: /pipili/i });
    expect(pipiliTab).toHaveAttribute('aria-selected', 'true');

    const notepadTab = screen.getByRole('tab', { name: /notepad/i });
    expect(notepadTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders note panel in notepad tab on click', async () => {
    const user = userEvent.setup();
    renderWithProvider(<CourseRightSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    await user.click(screen.getByRole('tab', { name: /notepad/i }));

    expect(await screen.findByText('My Notes')).toBeInTheDocument();
  });

  it('renders tabpanel for active tab', () => {
    renderWithProvider(<CourseRightSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toBeInTheDocument();
  });

  it('has accessible sidebar landmark', () => {
    renderWithProvider(<CourseRightSidebar />);
    const aside = screen.getByRole('complementary');
    expect(aside).toBeInTheDocument();
  });
});
