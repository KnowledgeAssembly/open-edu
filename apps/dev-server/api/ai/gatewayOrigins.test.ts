import { describe, expect, it } from 'vitest';
import { getAllowedGatewayOrigins } from './gatewayOrigins.js';

describe('getAllowedGatewayOrigins', () => {
  it('allows local browser origins only when local AI is enabled', () => {
    expect(getAllowedGatewayOrigins({ OPEN_EDU_LOCAL_AI: '1' })).toEqual(['*']);
    expect(getAllowedGatewayOrigins({})).toEqual([]);
  });

  it('preserves explicitly configured origins', () => {
    expect(
      getAllowedGatewayOrigins({
        OPEN_EDU_GATEWAY_ORIGINS: 'https://studio.example, https://admin.example',
        OPEN_EDU_LOCAL_AI: '1',
      }),
    ).toEqual(['https://studio.example', 'https://admin.example']);
  });
});
