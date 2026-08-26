import { describe, it, expect } from 'vitest';
import {
  WidgetMessageEnvelopeSchema,
  InitPayloadSchema,
  InteractionActionSchema,
  CompletePayloadSchema,
  StateSavePayloadSchema,
  StateSaveResultSchema,
  InteractionPayloadSchema,
  ResizePayloadSchema,
  HostToWidgetTypeSchema,
  WidgetToHostTypeSchema,
  PROTOCOL_API_VERSION,
} from './widget-protocol';
import { WidgetCapabilitySchema } from './community-widget-manifest';

const ENVELOPE: Record<string, unknown> = {
  apiVersion: 'open-edu.widget/1',
  type: 'init',
  instanceId: 'inst-1',
  nonce: 'nonce-1',
  sequence: 1,
};

function buildEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...ENVELOPE, ...overrides };
}

describe('WidgetMessageEnvelopeSchema', () => {
  it('parses a valid init envelope', () => {
    const result = WidgetMessageEnvelopeSchema.parse(
      buildEnvelope({ payload: { widgetId: 'community.example.counter' } }),
    );
    expect(result.type).toBe('init');
    expect(result.instanceId).toBe('inst-1');
    expect(result.sequence).toBe(1);
  });

  it('rejects a wrong apiVersion', () => {
    expect(() =>
      WidgetMessageEnvelopeSchema.parse(buildEnvelope({ apiVersion: 'open-edu.widget/2' })),
    ).toThrow();
  });

  it('rejects a negative or non-integer sequence', () => {
    expect(() => WidgetMessageEnvelopeSchema.parse(buildEnvelope({ sequence: -1 }))).toThrow();
    expect(() => WidgetMessageEnvelopeSchema.parse(buildEnvelope({ sequence: 1.5 }))).toThrow();
  });

  it('rejects an empty instanceId', () => {
    expect(() => WidgetMessageEnvelopeSchema.parse(buildEnvelope({ instanceId: '' }))).toThrow();
  });

  it('accepts an optional requestId', () => {
    expect(() =>
      WidgetMessageEnvelopeSchema.parse(
        buildEnvelope({ requestId: 'req-1', payload: { action: 'submit' } }),
      ),
    ).not.toThrow();
  });
});

describe('InitPayloadSchema', () => {
  it('parses a valid init payload', () => {
    const payload = {
      apiVersion: 'open-edu.widget/1',
      widgetId: 'community.example.counter',
      widgetVersion: '1.0.0',
      instanceId: 'inst-1',
      nodeId: 'node-1',
      config: {},
      storedState: { count: 3 },
      locale: 'en',
      theme: 'dark',
      themeTokens: { '--oe-bg': '#fff' },
      prefersReducedMotion: false,
      capabilities: WidgetCapabilitySchema.options,
    };
    const result = InitPayloadSchema.parse(payload);
    expect(result.widgetId).toBe('community.example.counter');
    expect(result.storedState).toEqual({ count: 3 });
  });

  it('parses an init payload with nonce and stateSchemaVersion, keeping both', () => {
    const payload = {
      apiVersion: 'open-edu.widget/1',
      widgetId: 'community.example.counter',
      widgetVersion: '1.0.0',
      instanceId: 'inst-1',
      nodeId: 'node-1',
      config: {},
      locale: 'en',
      theme: 'dark',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: [],
      nonce: 'req-nonce-1',
      stateSchemaVersion: '2',
    };
    const result = InitPayloadSchema.parse(payload);
    expect(result.nonce).toBe('req-nonce-1');
    expect(result.stateSchemaVersion).toBe('2');
  });

  it('leaves nonce and stateSchemaVersion undefined when absent', () => {
    const payload = {
      apiVersion: 'open-edu.widget/1',
      widgetId: 'community.example.counter',
      widgetVersion: '1.0.0',
      instanceId: 'inst-1',
      nodeId: 'node-1',
      config: {},
      locale: 'en',
      theme: 'light',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: [],
    };
    const result = InitPayloadSchema.parse(payload);
    expect(result.nonce).toBeUndefined();
    expect(result.stateSchemaVersion).toBeUndefined();
  });

  it('rejects an unknown theme', () => {
    const payload = {
      apiVersion: 'open-edu.widget/1',
      widgetId: 'community.example.counter',
      widgetVersion: '1.0.0',
      instanceId: 'inst-1',
      nodeId: 'node-1',
      config: {},
      locale: 'en',
      theme: 'sepia',
      themeTokens: {},
      prefersReducedMotion: false,
      capabilities: [],
    };
    expect(() => InitPayloadSchema.parse(payload)).toThrow();
  });
});

describe('InteractionActionSchema', () => {
  it('rejects an unknown interaction action', () => {
    expect(() => InteractionActionSchema.parse('hack')).toThrow();
  });

  it('accepts every enum value', () => {
    const actions = InteractionActionSchema.options;
    expect(actions).toContain('select');
    expect(() =>
      InteractionPayloadSchema.parse({ action: 'custom', data: { label: 'x' } }),
    ).not.toThrow();
  });
});

describe('CompletePayloadSchema', () => {
  it('rejects a score above 100', () => {
    expect(() => CompletePayloadSchema.parse({ score: 101 })).toThrow();
  });

  it('rejects a score below 0', () => {
    expect(() => CompletePayloadSchema.parse({ score: -1 })).toThrow();
  });

  it('accepts a valid score and reason', () => {
    expect(() => CompletePayloadSchema.parse({ score: 87, reason: 'finished' })).not.toThrow();
    expect(() => CompletePayloadSchema.parse({})).not.toThrow();
  });
});

describe('StateSave and resize payloads', () => {
  it('parses a valid state:save payload and result', () => {
    const payload = { requestId: 'req-1', schemaVersion: '1.0.0', state: { count: 4 } };
    const result = StateSavePayloadSchema.parse(payload);
    expect(result.requestId).toBe('req-1');
    expect(() =>
      StateSaveResultSchema.parse({ requestId: 'req-1', accepted: true, normalizedState: {} }),
    ).not.toThrow();
    expect(() =>
      StateSaveResultSchema.parse({
        requestId: 'req-1',
        accepted: false,
        rejectionReason: 'schema-invalid',
      }),
    ).not.toThrow();
    expect(() =>
      StateSaveResultSchema.parse({
        requestId: 'req-1',
        accepted: false,
        rejectionReason: 'unknown-reason',
      }),
    ).toThrow();
  });

  it('rejects a non-positive resize height', () => {
    expect(() => ResizePayloadSchema.parse({ height: 0 })).toThrow();
    expect(() => ResizePayloadSchema.parse({ height: 240 })).not.toThrow();
  });
});

describe('protocol enums', () => {
  it('defines host-to-widget and widget-to-host message types', () => {
    expect(HostToWidgetTypeSchema.options).toContain('init');
    expect(WidgetToHostTypeSchema.options).toContain('complete');
  });

  it('exports the protocol api version constant', () => {
    expect(PROTOCOL_API_VERSION).toBe('open-edu.widget/1');
  });
});
