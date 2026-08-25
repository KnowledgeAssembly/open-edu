import { describe, it, expect } from 'vitest';
import { computeSelfContainedCspHash } from './build-helpers';
describe('build-helpers', () => {
  it('produces sha256-<base64> for known input', () => {
    expect(computeSelfContainedCspHash('console.log(1)')).toMatch(/^sha256-[A-Za-z0-9+/=]{44}$/);
  });
});
