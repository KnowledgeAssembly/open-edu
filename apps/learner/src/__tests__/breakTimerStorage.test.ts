import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadBreakTimerSettings,
  saveBreakTimerSettings,
  clearBreakTimerSettings,
} from '../breakTimerStorage';

const STORAGE_KEY = 'oe-break-timer-settings';

describe('breakTimerStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default mode off when no saved data', () => {
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('off');
  });

  it('saves and loads 15 mode correctly', () => {
    saveBreakTimerSettings({ mode: '15' });
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('15');
  });

  it('saves and loads 30 mode correctly', () => {
    saveBreakTimerSettings({ mode: '30' });
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('30');
  });

  it('saves and loads 60 mode correctly', () => {
    saveBreakTimerSettings({ mode: '60' });
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('60');
  });

  it('returns default on malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('off');
  });

  it('returns default on corrupt data (wrong shape)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    const settings = loadBreakTimerSettings();
    expect(settings.mode).toBe('off');
  });

  it('clearBreakTimerSettings removes the key', () => {
    saveBreakTimerSettings({ mode: '30' });
    clearBreakTimerSettings();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
