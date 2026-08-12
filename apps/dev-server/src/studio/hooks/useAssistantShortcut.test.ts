import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useAssistantShortcut } from './useAssistantShortcut';

describe('useAssistantShortcut', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes handler on Cmd+Shift+A', () => {
    const handler = vi.fn();
    renderHook(() => useAssistantShortcut(handler));
    fireEvent.keyDown(document, { key: 'a', metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('invokes handler on Ctrl+Shift+A', () => {
    const handler = vi.fn();
    renderHook(() => useAssistantShortcut(handler));
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcut while typing in a textarea', () => {
    const handler = vi.fn();
    renderHook(() => useAssistantShortcut(handler));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: 'a', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    textarea.remove();
  });
});
