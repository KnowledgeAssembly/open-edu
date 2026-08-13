import { describe, it, expect } from 'vitest';
import { readTextareaSelection } from './EditorBridgeContext';

describe('readTextareaSelection', () => {
  it('returns null when selection is collapsed', () => {
    const el = {
      selectionStart: 2,
      selectionEnd: 2,
      value: 'abcdef',
    } as HTMLTextAreaElement;
    expect(readTextareaSelection(el)).toBeNull();
  });

  it('returns the selected slice when a range is selected', () => {
    const el = {
      selectionStart: 1,
      selectionEnd: 4,
      value: 'abcdef',
    } as HTMLTextAreaElement;
    expect(readTextareaSelection(el)).toEqual({ start: 1, end: 4, text: 'bcd' });
  });
});
