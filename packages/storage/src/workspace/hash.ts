/**
 * File hashing (SPEC §27). Uses SHA-256 via WebCrypto when available.
 *
 * NOTE: hashing runs on the main thread here. Large files should be hashed on
 * a Worker so the UI never blocks; the Worker hook is a documented follow-up —
 * this function is the sync-safe primitive both call paths share.
 */
export async function hashBytes(data: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto (crypto.subtle) is not available in this environment');
  }
  const digest = await subtle.digest('SHA-256', data as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function sha256Hex(data: Uint8Array): Promise<string> {
  return hashBytes(data);
}
