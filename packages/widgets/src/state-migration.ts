export function assertPersistableState(state: unknown, maxBytes = 64 * 1024): void {
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json).byteLength;
  if (bytes > maxBytes) throw new Error('too-large');
}
