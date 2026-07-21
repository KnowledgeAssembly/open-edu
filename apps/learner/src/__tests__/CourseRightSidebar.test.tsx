import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CourseRightSidebar } from '../CourseRightSidebar';
import { CompanionProvider } from '../ai';
import { I18nProvider } from '@open-edu/i18n';
import learnerDict from '@open-edu/i18n/locales/en/learner.json';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { learner: learnerDict } }}>
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
    renderWithProvider(
      <>
        <button data-testid="open-panel" onClick={() => {}}>
          Open
        </button>
        <CourseRightSidebar />
      </>,
    );
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
    expect(pipiliTab).toHaveAttribute('aria-controls', 'right-sidebar-tab-pipili');

    const notepadTab = screen.getByRole('tab', { name: /notepad/i });
    expect(notepadTab).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to notepad tab on click', () => {
    renderWithProvider(<CourseRightSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    fireEvent.click(screen.getByRole('tab', { name: /notepad/i }));

    expect(screen.getByRole('tab', { name: /notepad/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /pipili/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('Notepad feature coming soon.')).toBeInTheDocument();
  });

  it('renders tabpanel for active tab', () => {
    renderWithProvider(<CourseRightSidebar />);
    fireEvent.click(screen.getByRole('button', { name: /open sidebar/i }));

    const tabpanel = screen.getByRole('tabpanel');
    expect(tabpanel).toHaveAttribute('id', 'right-sidebar-tab-pipili');
    expect(tabpanel).toHaveAttribute('aria-labelledby', 'tab-pipili');
  });

  it('has accessible sidebar landmark', () => {
    renderWithProvider(<CourseRightSidebar />);
    const aside = screen.getByRole('complementary');
    expect(aside).toBeInTheDocument();
  });
});
