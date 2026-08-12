export function isAssistantEnabled(): boolean {
  const envFlag = typeof process !== 'undefined' && process.env?.OPEN_EDU_STUDIO_ASSISTANT === '1';
  const stored = localStorage.getItem('openedu.studio.assistant.enabled');
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return envFlag;
}