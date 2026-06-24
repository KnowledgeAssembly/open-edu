import { describe, it, expect } from 'vitest';
import {
  PackageLoadError,
  ManifestValidationError,
  NodeLoadError,
  AssetNotFoundError,
  WorkflowValidationError,
  RewardsValidationError,
  WorkflowRouteError,
  EntryNodeNotFoundError,
} from './errors';

describe('PackageLoadError', () => {
  it('sets the error name and code', () => {
    const err = new PackageLoadError('TEST_CODE', 'test message');
    expect(err.name).toBe('PackageLoadError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });
});

describe('ManifestValidationError', () => {
  it('sets zodError to null when not provided', () => {
    const err = new ManifestValidationError('bad manifest');
    expect(err.zodError).toBeNull();
    expect(err.code).toBe('MANIFEST_VALIDATION_ERROR');
  });
  it('is a PackageLoadError', () => {
    expect(new ManifestValidationError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('NodeLoadError', () => {
  it('sets the correct code', () => {
    const err = new NodeLoadError('bad node');
    expect(err.code).toBe('NODE_LOAD_ERROR');
    expect(err.message).toBe('bad node');
  });
  it('is a PackageLoadError', () => {
    expect(new NodeLoadError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('AssetNotFoundError', () => {
  it('sets the correct code and includes the path in the message', () => {
    const err = new AssetNotFoundError('images/missing.png');
    expect(err.code).toBe('ASSET_NOT_FOUND');
    expect(err.message).toContain('images/missing.png');
  });
  it('is a PackageLoadError', () => {
    expect(new AssetNotFoundError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('WorkflowValidationError', () => {
  it('sets zodError to null when not provided', () => {
    const err = new WorkflowValidationError('bad workflow');
    expect(err.zodError).toBeNull();
    expect(err.code).toBe('WORKFLOW_VALIDATION_ERROR');
  });
  it('is a PackageLoadError', () => {
    expect(new WorkflowValidationError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('RewardsValidationError', () => {
  it('sets zodError to null when not provided', () => {
    const err = new RewardsValidationError('bad rewards');
    expect(err.zodError).toBeNull();
    expect(err.code).toBe('REWARDS_VALIDATION_ERROR');
  });
  it('is a PackageLoadError', () => {
    expect(new RewardsValidationError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('WorkflowRouteError', () => {
  it('sets the correct code', () => {
    const err = new WorkflowRouteError('route to ghost');
    expect(err.code).toBe('WORKFLOW_ROUTE_ERROR');
    expect(err.message).toBe('route to ghost');
  });
  it('is a PackageLoadError', () => {
    expect(new WorkflowRouteError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('EntryNodeNotFoundError', () => {
  it('sets the correct code', () => {
    const err = new EntryNodeNotFoundError('entry missing');
    expect(err.code).toBe('ENTRY_NODE_NOT_FOUND');
    expect(err.message).toBe('entry missing');
  });
  it('is a PackageLoadError', () => {
    expect(new EntryNodeNotFoundError('x')).toBeInstanceOf(PackageLoadError);
  });
});

describe('hierarchy', () => {
  it('every subclass extends PackageLoadError', () => {
    for (const err of [
      new ManifestValidationError('x'),
      new NodeLoadError('x'),
      new AssetNotFoundError('x'),
      new WorkflowValidationError('x'),
      new RewardsValidationError('x'),
      new WorkflowRouteError('x'),
      new EntryNodeNotFoundError('x'),
    ]) {
      expect(err).toBeInstanceOf(PackageLoadError);
    }
  });
});

describe('diagnostics fields', () => {
  it('PackageLoadError stores file, path, and suggestion', () => {
    const err = new PackageLoadError('TEST', 'msg', {
      file: 'package.json',
      path: 'title',
      suggestion: 'Add a title field',
    });
    expect(err.file).toBe('package.json');
    expect(err.path).toBe('title');
    expect(err.suggestion).toBe('Add a title field');
  });

  it('ManifestValidationError accepts diagnostics', () => {
    const err = new ManifestValidationError('Invalid', undefined, {
      file: 'package.json',
      path: 'version',
      suggestion: 'Use semver like "0.1.0"',
    });
    expect(err.file).toBe('package.json');
    expect(err.path).toBe('version');
    expect(err.suggestion).toBe('Use semver like "0.1.0"');
  });

  it('WorkflowRouteError accepts diagnostics', () => {
    const err = new WorkflowRouteError('bad route', {
      path: 'nodes/missing.md',
      suggestion: 'Add the missing node file',
    });
    expect(err.path).toBe('nodes/missing.md');
    expect(err.suggestion).toBe('Add the missing node file');
  });

  it('EntryNodeNotFoundError accepts diagnostics', () => {
    const err = new EntryNodeNotFoundError('entry missing', {
      path: 'nodes/start.md',
      suggestion: 'Create the entry node file',
    });
    expect(err.path).toBe('nodes/start.md');
    expect(err.suggestion).toBe('Create the entry node file');
  });

  it('fields are undefined when not provided', () => {
    const err = new ManifestValidationError('simple');
    expect(err.file).toBeUndefined();
    expect(err.path).toBeUndefined();
    expect(err.suggestion).toBeUndefined();
  });
});
