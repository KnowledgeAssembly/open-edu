import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isAssistantEnabled } from './assistantFlags';

describe('isAssistantEnabled', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT;
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT;
  });

  it('defaults to off', () => {
    expect(isAssistantEnabled()).toBe(false);
  });

  it('respects OPEN_EDU_STUDIO_ASSISTANT=1', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT = '1';
    expect(isAssistantEnabled()).toBe(true);
  });

  it('localStorage true overrides env off', () => {
    localStorage.setItem('openedu.studio.assistant.enabled', 'true');
    expect(isAssistantEnabled()).toBe(true);
  });

  it('localStorage false overrides env on', () => {
    (globalThis as Record<string, unknown>).OPEN_EDU_STUDIO_ASSISTANT = '1';
    localStorage.setItem('openedu.studio.assistant.enabled', 'false');
    expect(isAssistantEnabled()).toBe(false);
  });
});
