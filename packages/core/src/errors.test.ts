import { describe, it, expect } from 'vitest';
import { PackageLoadError, ManifestValidationError, NodeLoadError } from './errors';

describe('PackageLoadError', () => {
  it('should set the error name', () => {
    const err = new PackageLoadError('TEST_CODE', 'test message');
    expect(err.name).toBe('PackageLoadError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });
});

describe('ManifestValidationError', () => {
  it('should set zodError to null when not provided', () => {
    const err = new ManifestValidationError('bad manifest');
    expect(err.zodError).toBeNull();
    expect(err.code).toBe('MANIFEST_VALIDATION_ERROR');
  });
});

describe('NodeLoadError', () => {
  it('should set the correct code', () => {
    const err = new NodeLoadError('bad node');
    expect(err.code).toBe('NODE_LOAD_ERROR');
    expect(err.message).toBe('bad node');
  });
});
