export function isAssistantEnabled(): boolean {
  const stored =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('openedu.studio.assistant.enabled')
      : null;
  if (stored === 'true') return true;
  if (stored === 'false') return false;

  if (
    typeof OPEN_EDU_STUDIO_ASSISTANT === 'string' &&
    OPEN_EDU_STUDIO_ASSISTANT === '1'
  ) {
    return true;
  }

  return false;
}
