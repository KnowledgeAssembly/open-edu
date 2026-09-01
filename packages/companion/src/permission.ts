export type PermissionKind = 'read' | 'propose' | 'commit' | 'destructive';

export interface Permission {
  id: string;
  kind: PermissionKind;
  scope?: string;
}

export interface CompanionPermissions {
  allowed: Permission[];
  requireApprovalFor: PermissionKind[];
}

export interface ApprovalRequest {
  id: string;
  changeSetId: string;
  kind: 'commit' | 'destructive';
  summary: string;
  requestedAt: number;
}

export interface PermissionPolicy {
  check(tool: { id: string; permission: Permission }, permissions: CompanionPermissions): boolean;
  requiresApproval(permission: Permission, permissions: CompanionPermissions): boolean;
}
