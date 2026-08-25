export function assertPersistableState(state: unknown, maxBytes = 64 * 1024): void {
  const json = JSON.stringify(state);
  if (json.length > maxBytes) throw new Error('too-large');
}
