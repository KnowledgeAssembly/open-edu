import { describe, it, expect } from 'vitest';
import { CLI_VERSION, validatePackage, devPackage, buildPackage, packagePackage } from './index';

describe('@open-edu/cli exports', () => {
  it('should export a version', () => {
    expect(CLI_VERSION).toBe('0.1.0');
  });

  it('should export command functions', () => {
    expect(validatePackage).toBeDefined();
    expect(devPackage).toBeDefined();
    expect(buildPackage).toBeDefined();
    expect(packagePackage).toBeDefined();
  });
});
