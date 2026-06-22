import { describe, it, expect } from 'vitest';
import {
  CORE_VERSION,
  loadPackage,
  loadManifest,
  loadWorkflow,
  loadRewards,
  loadNodes,
  resolveAssets,
  PackageLoadError,
} from './index';

describe('@open-edu/core', () => {
  it('should export CORE_VERSION', () => {
    expect(CORE_VERSION).toBe('0.1.0');
  });

  it('should export top-level functions', () => {
    expect(loadPackage).toBeInstanceOf(Function);
    expect(loadManifest).toBeInstanceOf(Function);
    expect(loadWorkflow).toBeInstanceOf(Function);
    expect(loadRewards).toBeInstanceOf(Function);
    expect(loadNodes).toBeInstanceOf(Function);
    expect(resolveAssets).toBeInstanceOf(Function);
    expect(PackageLoadError).toBeInstanceOf(Function);
  });
});
