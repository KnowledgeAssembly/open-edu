import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebouncedAutosave } from '../useDebouncedAutosave';
import type { NoteRecord } from '../../notesStorage';

vi.mock('../../notesStorage', () => ({
  nowIso: () => new Date().toISOString(),
}));

function makeNote(overrides: Partial<NoteRecord> = {}): NoteRecord {
  return {
    id: 'test-1',
    title: 'Test',
    content: 'Some content',
    favorite: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useDebouncedAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime('2026-01-01T00:00:00.000Z');
  });

  it('simulate changes, advance timers by 1500ms, assert save called once', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const { rerender } = renderHook(
      ({ note }: { note: NoteRecord }) => useDebouncedAutosave(note, save),
      { initialProps: { note: makeNote() } },
    );

    expect(save).not.toHaveBeenCalled();

    rerender({ note: makeNote({ title: 'Updated Title' }) });

    await act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Title' }));
  });

  it('flush saves pending', async () => {
    const save = vi.fn().mockResolvedValue(true);
    const { result, rerender } = renderHook(
      ({ note }: { note: NoteRecord }) => useDebouncedAutosave(note, save),
      { initialProps: { note: makeNote() } },
    );

    rerender({ note: makeNote({ title: 'Flush Test' }) });

    await act(async () => {
      await result.current.flush();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Flush Test' }));
  });

  it('empty note never saves', async () => {
    const save = vi.fn().mockResolvedValue(true);
    renderHook(() => useDebouncedAutosave(makeNote({ title: '', content: '' }), save));

    await act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(save).not.toHaveBeenCalled();
  });
});
