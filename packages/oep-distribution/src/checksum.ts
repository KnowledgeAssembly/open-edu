export async function computeSha256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const { createHash } = await import('node:crypto');
  const rawBytes = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) rawBytes[i] = data[i]!;
  return createHash('sha256').update(rawBytes).digest('hex');
}
