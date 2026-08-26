import { describe, it, expect } from 'vitest';
import { PROTOCOL_API_VERSION } from './index';

describe('@open-edu/widget-sdk', () => {
  it('exposes protocol version open-edu.widget/1', () => {
    expect(PROTOCOL_API_VERSION).toBe('open-edu.widget/1');
  });
});
