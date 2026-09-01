import type { CompanionPermissions, Permission, PermissionPolicy } from '@open-edu/companion';

/**
 * Default permission policy (spec §16): a tool is allowed when its declared
 * permission id is listed in the allowed set; `commit`/`destructive` kinds
 * require explicit approval.
 */
export const defaultPermissionPolicy: PermissionPolicy = {
  check(tool, permissions) {
    return permissions.allowed.some((p) => p.id === tool.permission.id);
  },
  requiresApproval(permission, permissions) {
    return permissions.requireApprovalFor.includes(permission.kind);
  },
};

export function permissionAllowed(
  tool: { id: string; permission: Permission },
  permissions: CompanionPermissions,
): boolean {
  return defaultPermissionPolicy.check(tool, permissions);
}

export function permissionRequiresApproval(
  permission: Permission,
  permissions: CompanionPermissions,
): boolean {
  return defaultPermissionPolicy.requiresApproval(permission, permissions);
}
