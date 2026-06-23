import { describe, it, expect } from 'vitest';
import type { LoadedPackage } from '@open-edu/core';
import { PackageLoadError, ManifestValidationError, WorkflowRouteError } from '@open-edu/core';
import {
  formatValidationSuccess,
  formatValidationError,
  formatDevMessage,
  formatBuildSuccess,
  formatPackageSuccess,
} from './format';

const validPkg: LoadedPackage = {
  rootDir: '/tmp/test-pkg',
  manifest: {
    id: 'test-pkg',
    title: 'Test Package',
    version: '1.0.0',
    author: 'Tester',
    entry: 'nodes/start.md',
  },
  workflow: {
    routing: { 'nodes/start.md': { onComplete: 'COMPLETED' } },
  },
  rewards: {
    triggers: [{ onEvent: 'node_complete', rewards: [{ action: 'badge.award', badge: 'done' }] }],
  },
  nodes: [
    {
      path: '/tmp/test-pkg/nodes/start.md',
      relativePath: 'nodes/start.md',
      content: '# Start',
      node: { type: 'lesson' },
    },
  ],
  assetPaths: ['images/logo.png'],
};

describe('formatValidationSuccess', () => {
  it('should return success message for valid package', () => {
    const messages = formatValidationSuccess(validPkg);
    expect(messages[0]?.type).toBe('success');
    expect(messages[0]?.text).toContain('Test Package');
    expect(messages[0]?.text).toContain('1.0.0');
    expect(messages[1]?.text).toContain('Tester');
  });

  it('should reflect workflow and rewards presence', () => {
    const messages = formatValidationSuccess(validPkg);
    expect(messages.some((m) => m.text.includes('1 routes'))).toBe(true);
    expect(messages.some((m) => m.text.includes('1 triggers'))).toBe(true);
  });

  it('should handle null workflow and rewards', () => {
    const noExtras: LoadedPackage = { ...validPkg, workflow: null, rewards: null };
    const messages = formatValidationSuccess(noExtras);
    expect(messages.some((m) => m.text.includes('Workflow: no'))).toBe(true);
    expect(messages.some((m) => m.text.includes('Rewards: no'))).toBe(true);
  });
});

describe('formatValidationError', () => {
  it('should format PackageLoadError', () => {
    const err = new PackageLoadError('TEST_CODE', 'something went wrong');
    const messages = formatValidationError(err);
    expect(messages[0]?.type).toBe('error');
    expect(messages.some((m) => m.text.includes('TEST_CODE'))).toBe(true);
    expect(messages.some((m) => m.text.includes('something went wrong'))).toBe(true);
  });

  it('should format ManifestValidationError with Zod issues', () => {
    const zodErr = { issues: [{ path: ['title'], message: 'Required' }] } as any;
    const err = new ManifestValidationError('invalid manifest', zodErr);
    const messages = formatValidationError(err);
    expect(messages.some((m) => m.text.includes('title'))).toBe(true);
    expect(messages.some((m) => m.text.includes('Required'))).toBe(true);
  });

  it('should format WorkflowRouteError', () => {
    const err = new WorkflowRouteError('Route to nowhere');
    const messages = formatValidationError(err);
    expect(messages.some((m) => m.text.includes('WORKFLOW_ROUTE_ERROR'))).toBe(true);
    expect(messages.some((m) => m.text.includes('Route to nowhere'))).toBe(true);
  });

  it('should format generic Error', () => {
    const err = new Error('generic failure');
    const messages = formatValidationError(err);
    expect(messages.some((m) => m.text.includes('generic failure'))).toBe(true);
  });

  it('should format non-Error values', () => {
    const messages = formatValidationError('string error');
    expect(messages.some((m) => m.text.includes('string error'))).toBe(true);
  });
});

describe('formatDevMessage', () => {
  it('should include Epic 10 message', () => {
    const messages = formatDevMessage(validPkg);
    expect(messages[0]?.type).toBe('success');
    expect(messages.some((m) => m.text.includes('Epic 10'))).toBe(true);
  });
});

describe('formatBuildSuccess', () => {
  it('should include output directory', () => {
    const messages = formatBuildSuccess('/tmp/out');
    expect(messages.some((m) => m.text.includes('/tmp/out'))).toBe(true);
  });
});

describe('formatPackageSuccess', () => {
  it('should include archive path', () => {
    const messages = formatPackageSuccess('/tmp/test.tar.gz');
    expect(messages.some((m) => m.text.includes('/tmp/test.tar.gz'))).toBe(true);
  });
});
