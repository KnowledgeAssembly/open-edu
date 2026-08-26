import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import {
  SIGNATURE_ALGORITHM,
  widgetSignaturePayload,
  verifyWidgetSignature,
  signWidgetSignature,
  type WidgetSignature,
} from './signatures.js';

function makeSig(publicKey: string, value: string): WidgetSignature {
  return { alg: 'ed25519', publicKey, value };
}

describe('signatures', () => {
  it('SIGNATURE_ALGORITHM is ed25519', () => {
    expect(SIGNATURE_ALGORITHM).toBe('ed25519');
  });

  it('widgetSignaturePayload is id + version + documentIntegrity joined by newlines', () => {
    const bytes = widgetSignaturePayload('community.example.counter', '1.0.0', 'sha256-abc');
    expect(new TextDecoder().decode(bytes)).toBe('community.example.counter\n1.0.0\nsha256-abc');
  });

  it('verifies a valid ed25519 signature', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const payload = widgetSignaturePayload('id', '1.0.0', 'sha256-abc');
    expect(
      verifyWidgetSignature(
        payload,
        makeSig(publicKeyPem, signWidgetSignature(payload, privateKeyPem)),
      ),
    ).toBe(true);
  });

  it('rejects a tampered documentIntegrity', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const payload = widgetSignaturePayload('id', '1.0.0', 'sha256-abc');
    const sig = signWidgetSignature(payload, privateKeyPem);
    const tampered = widgetSignaturePayload('id', '1.0.0', 'sha256-evil');
    expect(verifyWidgetSignature(tampered, makeSig(publicKeyPem, sig))).toBe(false);
  });

  it('rejects a signature made with a different (wrong) public key', () => {
    const { publicKey: pkA, privateKey: skA } = generateKeyPairSync('ed25519');
    const { publicKey: pkB } = generateKeyPairSync('ed25519');
    const payload = widgetSignaturePayload('id', '1.0.0', 'sha256-abc');
    const sigA = signWidgetSignature(
      payload,
      skA.export({ type: 'pkcs8', format: 'pem' }).toString(),
    );
    const pkBpem = pkB.export({ type: 'spki', format: 'pem' }).toString();
    expect(verifyWidgetSignature(payload, makeSig(pkBpem, sigA))).toBe(false);
    void pkA;
  });
});
