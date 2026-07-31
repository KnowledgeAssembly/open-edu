import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useCompanionShortcut } from '../useCompanionShortcut.js';

describe('useCompanionShortcut', () => {
  it('calls handler on Cmd+Shift+P', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls handler on Ctrl+Shift+P', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'P', ctrlKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler on a plain P press', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    fireEvent.keyDown(document, { key: 'p' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores the shortcut while an input has focus', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });

  it('ignores the shortcut while a textarea has focus', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    textarea.remove();
  });

  it('ignores the shortcut inside a contenteditable element', () => {
    const handler = vi.fn();
    renderHook(() => useCompanionShortcut(handler));
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    document.body.appendChild(editable);
    fireEvent.keyDown(editable, { key: 'p', metaKey: true, shiftKey: true });
    expect(handler).not.toHaveBeenCalled();
    editable.remove();
  });

  it('uses the latest handler after re-render', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ h }) => useCompanionShortcut(h), {
      initialProps: { h: first },
    });
    rerender({ h: second });
    fireEvent.keyDown(document, { key: 'p', metaKey: true, shiftKey: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
