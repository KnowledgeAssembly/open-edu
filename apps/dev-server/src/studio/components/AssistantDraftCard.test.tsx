import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssistantDraftCard } from './AssistantDraftCard';
import type { DraftItem } from '../ai/types';

vi.mock('@open-edu/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@open-edu/design-system', () => ({
  Button: ({ children, onClick, className, disabled, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} className={className} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
  Dialog: ({ children, open }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('./ItemDraftPreview', () => ({
  ItemDraftPreview: ({ item }: any) => <div data-testid="draft-preview">{item.title}</div>,
}));

describe('AssistantDraftCard', () => {
  const lessonDraft: DraftItem = {
    kind: 'lesson',
    title: 'Test Lesson',
    content: '# Test\n\nContent',
  };

  it('renders draft preview and action buttons', () => {
    const onUse = vi.fn();
    const onDiscard = vi.fn();

    render(
      <AssistantDraftCard
        item={lessonDraft}
        index={0}
        total={1}
        onUse={onUse}
        onDiscard={onDiscard}
      />,
    );

    expect(screen.getByTestId('draft-preview')).toBeTruthy();
    expect(screen.getByText(/studio\.assistant\.draft\.use/)).toBeTruthy();
  });

  it('calls onUse when Use button is clicked', () => {
    const onUse = vi.fn();
    const onDiscard = vi.fn();

    render(
      <AssistantDraftCard
        item={lessonDraft}
        index={0}
        total={1}
        onUse={onUse}
        onDiscard={onDiscard}
      />,
    );

    fireEvent.click(screen.getByText(/studio\.assistant\.draft\.use/));
    expect(onUse).toHaveBeenCalledWith(lessonDraft);
  });

  it('confirms before Use when editor is dirty', () => {
    const onUse = vi.fn();

    render(
      <AssistantDraftCard
        item={lessonDraft}
        index={0}
        total={1}
        onUse={onUse}
        onDiscard={vi.fn()}
        isDirty
      />,
    );

    fireEvent.click(screen.getByText(/studio\.assistant\.draft\.use/));
    expect(onUse).not.toHaveBeenCalled();
    expect(screen.getByTestId('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText(/studio\.assistant\.draft\.confirmApply/));
    expect(onUse).toHaveBeenCalledWith(lessonDraft);
  });
});
