import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import { RuntimeThemeProvider } from '@open-edu/runtime';
import { describe, expect, it } from 'vitest';
import { ExploreCourses } from '../components/sections/ExploreCourses';
import { dictionaries } from '../i18n-dictionaries';

const ALL_COURSE_TITLES = [
  'Indian Tribal Art',
  'World of Atoms',
  'Ancient Civilizations',
  'Shapes in the Real World',
  'Mindful Moments',
];

function renderSection(): void {
  render(
    <I18nProvider locale="en" supportedLocales={['en']} dictionaries={dictionaries}>
      <RuntimeThemeProvider themeId="lumina-scholastica">
        <ExploreCourses />
      </RuntimeThemeProvider>
    </I18nProvider>,
  );
}

function expectAllCourses(): void {
  ALL_COURSE_TITLES.forEach((title) => {
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
  });
}

describe('ExploreCourses', () => {
  it('renders the section title', () => {
    renderSection();
    expect(
      screen.getByRole('heading', { name: 'Discover a course for every curiosity' }),
    ).toBeInTheDocument();
  });

  it('renders all 5 course titles with the All filter', () => {
    renderSection();
    expectAllCourses();
  });

  it('shows only World of Atoms when the Science pill is active', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Science' }));
    expect(screen.getByRole('heading', { name: 'World of Atoms' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Indian Tribal Art' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Ancient Civilizations' }),
    ).not.toBeInTheDocument();
  });

  it('restores all 5 courses when the All pill is clicked again', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('button', { name: 'Science' }));
    await user.click(screen.getByRole('button', { name: 'All' }));
    expectAllCourses();
  });

  it('renders prev/next chevron buttons with the correct aria labels', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Scroll to previous courses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scroll to next courses' })).toBeInTheDocument();
  });
});
