import { describe, it, expect } from 'vitest';
import { createDevRegistry } from './dev-registry';
describe('createDevRegistry', () => {
  it('defaults to localhost http relaxed origin (dev only)', () => {
    expect(createDevRegistry().relaxedOrigins).toEqual(['http://localhost:4177']);
  });
  it('honors provided relaxed origins', () => {
    expect(
      createDevRegistry({ relaxedOrigins: ['https://dev.example.com'] }).relaxedOrigins,
    ).toEqual(['https://dev.example.com']);
  });
});
