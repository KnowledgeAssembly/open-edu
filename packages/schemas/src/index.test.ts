import { describe, it, expect } from 'vitest';
import {
  SCHEMAS_VERSION,
  PackageManifestSchema,
  ContentNodeSchema,
  WorkflowSchema,
  RewardsSchema,
  TelemetryEventSchema,
  toJsonSchema,
} from './index';

describe('@open-edu/schemas', () => {
  it('should export SCHEMAS_VERSION', () => {
    expect(SCHEMAS_VERSION).toBe('0.1.0');
  });

  it('should export all schema exports', () => {
    expect(PackageManifestSchema).toBeDefined();
    expect(ContentNodeSchema).toBeDefined();
    expect(WorkflowSchema).toBeDefined();
    expect(RewardsSchema).toBeDefined();
    expect(TelemetryEventSchema).toBeDefined();
    expect(toJsonSchema).toBeDefined();
  });
});
