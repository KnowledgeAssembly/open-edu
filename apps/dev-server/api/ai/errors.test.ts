// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { GatewayError, safeErrorBody, classifyGatewayError, isGatewayError } from './errors.js';

describe('GatewayError contract', () => {
  it('builds a structured error without leaking internals', () => {
    const body = safeErrorBody('req-1', 'provider-error', 'The AI provider could not be reached.');
    expect(body.requestId).toBe('req-1');
    expect(body.error.code).toBe('provider-error');
    expect(JSON.stringify(body)).not.toMatch(/api[_-]?key/i);
    expect(JSON.stringify(body)).not.toMatch(/stack/i);
    expect(JSON.stringify(body)).not.toMatch(/\/Users\//);
    expect(JSON.stringify(body)).not.toMatch(/tmp\/openedu/);
  });

  it('classifies a timeout error', () => {
    const err = classifyGatewayError('req-1', new Error('operation timed out'), 504);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.code).toBe('timeout');
    expect(err.status).toBe(504);
  });

  it('classifies a generic provider error safely', () => {
    const err = classifyGatewayError('req-1', new Error('openai: 401 invalid key'));
    expect(err).toBeInstanceOf(GatewayError);
    expect(err.code).toBe('provider-error');
    expect(err.message).not.toMatch(/401/);
    expect(err.message).not.toMatch(/invalid key/);
  });

  it('passes through existing GatewayErrors', () => {
    const original = new GatewayError('rate-limited', 'Too many requests', 'req-1', 429);
    expect(classifyGatewayError('req-1', original)).toBe(original);
    expect(isGatewayError(original)).toBe(true);
  });

  it('never exposes raw provider messages on the error body', () => {
    const body = safeErrorBody('req-1', 'generation-error', 'generation failed');
    expect(typeof body.error.message).toBe('string');
    expect(body.error.message).not.toMatch(/secret|token|Bearer/);
  });
});
