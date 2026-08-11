import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { AddActivityMenu } from './AddActivityMenu';

function wrap(ui: React.ReactElement) {
  return (
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      {ui}
    </I18nProvider>
  );
}

describe('AddActivityMenu', () => {
  it('renders the trigger labelled "Add activity" and shows no menu by default', () => {
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={() => {}}
          onAddPractice={() => {}}
          onAddAi={() => {}}
        />,
      ),
    );
    expect(screen.getByRole('button', { name: /add activity/i })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu when clicking the trigger', async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={() => {}}
          onAddPractice={() => {}}
          onAddAi={() => {}}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
  });

  it('calls onAddLesson when clicking Add lesson', async () => {
    const user = userEvent.setup();
    const onAddLesson = vi.fn();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={onAddLesson}
          onAddQuiz={() => {}}
          onAddPractice={() => {}}
          onAddAi={() => {}}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    await user.click(await screen.findByRole('menuitem', { name: /add lesson/i }));
    expect(onAddLesson).toHaveBeenCalledTimes(1);
  });

  it('calls onAddQuiz when clicking Add quiz', async () => {
    const user = userEvent.setup();
    const onAddQuiz = vi.fn();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={onAddQuiz}
          onAddPractice={() => {}}
          onAddAi={() => {}}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    await user.click(await screen.findByRole('menuitem', { name: /add quiz/i }));
    expect(onAddQuiz).toHaveBeenCalledTimes(1);
  });

  it('calls onAddPractice when clicking Add practice', async () => {
    const user = userEvent.setup();
    const onAddPractice = vi.fn();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={() => {}}
          onAddPractice={onAddPractice}
          onAddAi={() => {}}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    await user.click(await screen.findByRole('menuitem', { name: /add practice/i }));
    expect(onAddPractice).toHaveBeenCalledTimes(1);
  });

  it('calls onAddAi when clicking the AI item', async () => {
    const user = userEvent.setup();
    const onAddAi = vi.fn();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={() => {}}
          onAddPractice={() => {}}
          onAddAi={onAddAi}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    await user.click(await screen.findByRole('menuitem', { name: /ai draft/i }));
    expect(onAddAi).toHaveBeenCalledTimes(1);
  });

  it('closes the menu after selecting an item', async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <AddActivityMenu
          onAddLesson={() => {}}
          onAddQuiz={() => {}}
          onAddPractice={() => {}}
          onAddAi={() => {}}
        />,
      ),
    );
    await user.click(screen.getByRole('button', { name: /add activity/i }));
    const menu = await screen.findByRole('menu');
    expect(menu).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: /add lesson/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
