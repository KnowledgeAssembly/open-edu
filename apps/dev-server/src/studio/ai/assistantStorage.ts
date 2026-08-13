export const ASSISTANT_STORAGE_KEYS = {
  PANEL_OPEN: 'openedu.studio.assistant.open',
  PANEL_WIDTH: 'openedu.studio.assistant.width',
  THREAD_PREFIX: 'openedu.studio.ai.thread.',
} as const;

export function getAssistantPanelOpen(): boolean {
  return localStorage.getItem(ASSISTANT_STORAGE_KEYS.PANEL_OPEN) === 'true';
}

export function setAssistantPanelOpen(open: boolean): void {
  localStorage.setItem(ASSISTANT_STORAGE_KEYS.PANEL_OPEN, String(open));
}

export function getAssistantPanelWidth(): number {
  const stored = localStorage.getItem(ASSISTANT_STORAGE_KEYS.PANEL_WIDTH);
  return stored ? parseInt(stored, 10) : 360;
}

export function setAssistantPanelWidth(width: number): void {
  localStorage.setItem(ASSISTANT_STORAGE_KEYS.PANEL_WIDTH, String(width));
}

export function getConversationId(courseId: string): string | null {
  const key = `${ASSISTANT_STORAGE_KEYS.THREAD_PREFIX}${courseId}`;
  return sessionStorage.getItem(key);
}

export function setConversationId(courseId: string, conversationId: string): void {
  const key = `${ASSISTANT_STORAGE_KEYS.THREAD_PREFIX}${courseId}`;
  sessionStorage.setItem(key, conversationId);
}

export function clearConversationId(courseId: string): void {
  const key = `${ASSISTANT_STORAGE_KEYS.THREAD_PREFIX}${courseId}`;
  sessionStorage.removeItem(key);
}
