import { describe, it, expect } from 'vitest';
import { getUpdateState } from '../update.js';

describe('Update detection', () => {
  it('returns update state with expected properties', () => {
    const state = getUpdateState();
    expect(state).toHaveProperty('updateAvailable');
    expect(state).toHaveProperty('registration');
  });

  it('returns no update available by default', () => {
    const state = getUpdateState();
    expect(state.updateAvailable).toBe(false);
  });
});
