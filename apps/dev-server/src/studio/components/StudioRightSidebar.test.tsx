import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { I18nProvider } from '@open-edu/i18n';
import studioEn from '@open-edu/i18n/locales/en/studio.json';
import { StudioAssistantProvider, useStudioAssistant } from '../ai/StudioAssistantProvider';
import { StudioChatProvider } from '../ai/StudioChatProvider';
import { StudioRightSidebar } from './StudioRightSidebar';
import type { StudioContextSnapshot } from '../ai/context';

(globalThis as { axe?: typeof axe }).axe = axe;

const sendSpy = vi.fn();

vi.mock('../ai', async () => {
  const actual = (await vi.importActual('../ai')) as Record<string, unknown>;
  return {
    ...actual,
    useStudioChat: () => ({
      messages: [],
      sendMessage: sendSpy,
      status: 'idle' as const,
      stop: vi.fn(),
      regenerate: vi.fn(),
      clearError: vi.fn(),
      clearMessages: vi.fn(),
    }),
  };
});

function ContextSeeder({
  snapshot,
  children,
}: {
  snapshot: StudioContextSnapshot;
  children: ReactNode;
}) {
  const { setContext } = useStudioAssistant();
  useEffect(() => {
    setContext(snapshot);
  }, [setContext, snapshot]);
  return <>{children}</>;
}

const defaultSnapshot: StudioContextSnapshot = {
  view: 'outline',
  locale: 'en',
  aiAvailable: true,
  course: {
    id: 'course-1',
    title: 'Course',
    activityCount: 2,
    outline: [
      { title: 'A', kind: 'lesson', path: 'nodes/a.md' },
      { title: 'B', kind: 'quiz', path: 'nodes/b.json' },
    ],
  },
};

function wrap(ui: React.ReactElement, snapshot: StudioContextSnapshot = defaultSnapshot) {
  return render(
    <I18nProvider locale="en" dictionaries={{ en: { studio: studioEn as Record<string, string> } }}>
      <StudioAssistantProvider>
        <StudioChatProvider courseId="course-1">
          <ContextSeeder snapshot={snapshot}>{ui}</ContextSeeder>
        </StudioChatProvider>
      </StudioAssistantProvider>
    </I18nProvider>,
  );
}

describe('StudioRightSidebar', () => {
  beforeEach(() => {
    sendSpy.mockClear();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders collapsed rail when panel is closed', () => {
    wrap(<StudioRightSidebar />);
    expect(screen.getByRole('button', { name: /open author assistant/i })).toBeInTheDocument();
  });

  it('opens panel and shows complementary landmark', async () => {
    wrap(<StudioRightSidebar />);
    await userEvent.click(screen.getByRole('button', { name: /open author assistant/i }));
    expect(screen.getByRole('complementary', { name: /author assistant/i })).toBeInTheDocument();
  });

  it('sends suggestion chip messages via sendMessage', async () => {
    localStorage.setItem('openedu.studio.assistant.open', 'true');
    wrap(<StudioRightSidebar />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /how do i add a lesson/i })).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /how do i add a lesson/i }));
    expect(sendSpy).toHaveBeenCalledWith('How do I add a lesson?');
  });

  it('toggles panel with Cmd+Shift+A', async () => {
    wrap(<StudioRightSidebar />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'a', metaKey: true, shiftKey: true });
    expect(
      await screen.findByRole('complementary', { name: /author assistant/i }),
    ).toBeInTheDocument();
  });

  it('passes axe a11y checks when open', async () => {
    localStorage.setItem('openedu.studio.assistant.open', 'true');
    const { container } = wrap(<StudioRightSidebar />);
    await waitFor(() => {
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
