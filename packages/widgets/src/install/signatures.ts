import { createPublicKey, createPrivateKey, verify, sign } from 'node:crypto';

export const SIGNATURE_ALGORITHM = 'ed25519';

export interface WidgetSignature {
  alg: 'ed25519';
  publicKey: string;
  value: string;
}

export function widgetSignaturePayload(
  id: string,
  version: string,
  documentIntegrity: string,
): Uint8Array {
  return new TextEncoder().encode(`${id}\n${version}\n${documentIntegrity}`);
}

export function verifyWidgetSignature(payloadBytes: Uint8Array, sig: WidgetSignature): boolean {
  const publicKey = createPublicKey({ key: sig.publicKey, format: 'pem', type: 'spki' });
  const sigBuffer = Buffer.from(sig.value, 'base64');
  return verify(null, payloadBytes, publicKey, sigBuffer);
}

export function signWidgetSignature(payloadBytes: Uint8Array, privateKeyPem: string): string {
  const key = createPrivateKey({ key: privateKeyPem, format: 'pem', type: 'pkcs8' });
  return sign(null, payloadBytes, key).toString('base64');
}
