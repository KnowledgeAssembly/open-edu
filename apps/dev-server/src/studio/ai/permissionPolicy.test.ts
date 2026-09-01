import { describe, it, expect } from 'vitest';
import type { CompanionPermissions, Permission } from '@open-edu/companion';
import {
  defaultPermissionPolicy,
  permissionAllowed,
  permissionRequiresApproval,
} from './permissionPolicy.js';

const permissions: CompanionPermissions = {
  allowed: [
    { id: 'course.generate', kind: 'propose' },
    { id: 'item.generate', kind: 'propose' },
  ],
  requireApprovalFor: ['commit', 'destructive'],
};

describe('permission policy', () => {
  it('allows a tool whose permission id is in the allowed set', () => {
    expect(
      permissionAllowed(
        { id: 'generate_item', permission: { id: 'item.generate', kind: 'propose' } },
        permissions,
      ),
    ).toBe(true);
  });

  it('denies a tool whose permission id is not in the allowed set', () => {
    expect(
      permissionAllowed(
        { id: 'secret.write', permission: { id: 'secret.write', kind: 'propose' } },
        permissions,
      ),
    ).toBe(false);
  });

  it('requires approval when the permission kind is flagged', () => {
    expect(permissionRequiresApproval({ id: 'cs.apply', kind: 'commit' }, permissions)).toBe(true);
    expect(permissionRequiresApproval({ id: 'item.generate', kind: 'propose' }, permissions)).toBe(
      false,
    );
  });

  it('defaultPermissionPolicy.check matches the exposed helper', () => {
    const tool = {
      id: 'generate_item',
      permission: { id: 'item.generate', kind: 'propose' },
    } satisfies { id: string; permission: Permission };
    expect(defaultPermissionPolicy.check(tool, permissions)).toBe(
      permissionAllowed(tool, permissions),
    );
  });
});
