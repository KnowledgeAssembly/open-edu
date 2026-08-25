export const VALID_INIT_MESSAGE = {
  apiVersion: 'open-edu.widget/1' as const,
  type: 'init' as const,
  instanceId: 'test-instance',
  nonce: 'test-nonce',
  sequence: 1,
  payload: {
    apiVersion: 'open-edu.widget/1',
    widgetId: 'community.example.counter',
    widgetVersion: '1.0.0',
    instanceId: 'test-instance',
    nodeId: 'node-1',
    config: {},
    locale: 'en',
    theme: 'light' as const,
    themeTokens: {},
    prefersReducedMotion: false,
    capabilities: ['resize', 'telemetry-interaction'],
  },
};

export const WRONG_NONCE_MESSAGE = {
  apiVersion: 'open-edu.widget/1' as const,
  type: 'ready' as const,
  instanceId: 'test-instance',
  nonce: 'wrong-nonce',
  sequence: 1,
  payload: {},
};

export const EXPIRED_SEQUENCE_MESSAGE = {
  apiVersion: 'open-edu.widget/1' as const,
  type: 'ready' as const,
  instanceId: 'test-instance',
  nonce: 'test-nonce',
  sequence: 99,
  payload: {},
};

export const MULTI_FILE_CSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' data:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none';";

export const SELF_CONTAINED_CSP_PREFIX = "default-src 'none'; script-src 'sha256-";

export const CAPABILITY_REQUEST_V1_REJECTION_FIXTURE = {
  apiVersion: 'open-edu.widget/1' as const,
  type: 'capability:request',
  instanceId: 'test-instance',
  nonce: 'test-nonce',
  sequence: 1,
  payload: { capability: 'resize' },
} as const;
