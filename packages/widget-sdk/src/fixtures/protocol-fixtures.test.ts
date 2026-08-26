import { describe, it, expect } from 'vitest';
import { WidgetMessageEnvelopeSchema } from '@open-edu/schemas';
import { validateHostBoundMessage, type HostSession } from '../validate-message';
import {
  VALID_INIT_MESSAGE,
  WRONG_NONCE_MESSAGE,
  EXPIRED_SEQUENCE_MESSAGE,
  MULTI_FILE_CSP,
  SELF_CONTAINED_CSP_PREFIX,
  CAPABILITY_REQUEST_V1_REJECTION_FIXTURE,
} from './protocol-fixtures';

const SESSION: HostSession = {
  instanceId: 'test-instance',
  nonce: 'test-nonce',
  expectedOrigin: 'https://app.example.com',
  lastSequence: 0,
};

describe('protocol fixtures', () => {
  it('VALID_INIT_MESSAGE is a shape-valid envelope', () => {
    expect(WidgetMessageEnvelopeSchema.safeParse(VALID_INIT_MESSAGE).success).toBe(true);
  });

  it('WRONG_NONCE_MESSAGE is a shape-valid envelope', () => {
    expect(WidgetMessageEnvelopeSchema.safeParse(WRONG_NONCE_MESSAGE).success).toBe(true);
  });

  it('EXPIRED_SEQUENCE_MESSAGE is a shape-valid envelope', () => {
    expect(WidgetMessageEnvelopeSchema.safeParse(EXPIRED_SEQUENCE_MESSAGE).success).toBe(true);
  });

  it('MULTI_FILE_CSP denies connect and frame targets', () => {
    expect(MULTI_FILE_CSP).toContain("connect-src 'none'");
    expect(MULTI_FILE_CSP).toContain("frame-src 'none'");
  });

  it('SELF_CONTAINED_CSP_PREFIX is the documented self-contained pattern', () => {
    expect(SELF_CONTAINED_CSP_PREFIX).toBe("default-src 'none'; script-src 'sha256-");
    expect(MULTI_FILE_CSP.startsWith(SELF_CONTAINED_CSP_PREFIX)).toBe(false);
  });
});

describe('host-bound validation of fixtures', () => {
  it('deterministically drops capability:request on v1', () => {
    const result = validateHostBoundMessage(
      CAPABILITY_REQUEST_V1_REJECTION_FIXTURE,
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('rejects WRONG_NONCE_MESSAGE', () => {
    const result = validateHostBoundMessage(
      WRONG_NONCE_MESSAGE,
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'nonce' });
  });

  it('rejects EXPIRED_SEQUENCE_MESSAGE', () => {
    const result = validateHostBoundMessage(
      EXPIRED_SEQUENCE_MESSAGE,
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'sequence' });
  });
});
