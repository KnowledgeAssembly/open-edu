import { describe, expect, it } from 'vitest';
import { getAllowedGatewayOrigins } from './gatewayOrigins.js';

describe('getAllowedGatewayOrigins', () => {
  it('allows all origins on Vercel when unconfigured', () => {
    expect(getAllowedGatewayOrigins({ VERCEL: '1' })).toEqual(['*']);
  });

  it('allows all origins locally when OPEN_EDU_LOCAL_AI is enabled', () => {
    expect(getAllowedGatewayOrigins({ OPEN_EDU_LOCAL_AI: '1' })).toEqual(['*']);
  });

  it('restricts to same-origin locally when unconfigured', () => {
    expect(getAllowedGatewayOrigins({})).toEqual([]);
  });

  it('preserves explicitly configured origins', () => {
    expect(
      getAllowedGatewayOrigins({
        OPEN_EDU_GATEWAY_ORIGINS: 'https://studio.example, https://admin.example',
        VERCEL: '1',
      }),
    ).toEqual(['https://studio.example', 'https://admin.example']);
  });
});
