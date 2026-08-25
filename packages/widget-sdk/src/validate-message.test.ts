import { describe, it, expect } from 'vitest';
import {
  validateHostBoundMessage,
  validateWidgetBoundMessage,
  type HostSession,
} from './validate-message';

const SESSION: HostSession = {
  instanceId: 'inst-1',
  nonce: 'nonce-1',
  expectedOrigin: 'https://app.example.com',
  lastSequence: 0,
};

function makeEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    apiVersion: 'open-edu.widget/1',
    type: 'ready',
    instanceId: 'inst-1',
    nonce: 'nonce-1',
    sequence: 1,
    payload: {},
    ...overrides,
  };
}

describe('validateHostBoundMessage', () => {
  it('rejects a message from the wrong origin', () => {
    const result = validateHostBoundMessage(makeEnvelope(), 'https://evil.example.com', SESSION);
    expect(result).toEqual({ ok: false, reason: 'origin' });
  });

  it('rejects a message with the wrong nonce', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ nonce: 'nonce-2' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'nonce' });
  });

  it('rejects a message addressed to another instance', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ instanceId: 'inst-2' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'instance' });
  });

  it('rejects an out-of-order sequence', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ sequence: 3 }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'sequence' });
  });

  it('rejects an unsupported apiVersion', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ apiVersion: 'wrong' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'api-version' });
  });

  it('accepts a valid ready message', () => {
    const result = validateHostBoundMessage(makeEnvelope(), 'https://app.example.com', SESSION);
    expect(result).toEqual({ ok: true, message: expect.objectContaining({ type: 'ready', sequence: 1 }) });
  });

  it('rejects a malformed non-object payload', () => {
    expect(
      validateHostBoundMessage('garbage', 'https://app.example.com', SESSION),
    ).toEqual({ ok: false, reason: 'malformed' });
    expect(validateHostBoundMessage(null, 'https://app.example.com', SESSION)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('rejects an unknown message type', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ type: 'garbage' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });

  it('drops capability:request on v1 since the request/response channel is not implemented', () => {
    const result = validateHostBoundMessage(
      makeEnvelope({ type: 'capability:request' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });
});

describe('validateWidgetBoundMessage', () => {
  it('accepts a valid init message from the host', () => {
    const result = validateWidgetBoundMessage(
      makeEnvelope({ type: 'init' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: true, message: expect.objectContaining({ type: 'init' }) });
  });

  it('rejects a widget-only message type', () => {
    const result = validateWidgetBoundMessage(
      makeEnvelope({ type: 'ready' }),
      'https://app.example.com',
      SESSION,
    );
    expect(result).toEqual({ ok: false, reason: 'type' });
  });
});
