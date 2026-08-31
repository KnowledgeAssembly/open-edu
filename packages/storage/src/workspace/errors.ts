export class WorkspaceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}
export class WorkspaceNotFoundError extends WorkspaceError {}
export class WorkspacePathError extends WorkspaceError {}
export class WorkspacePermissionError extends WorkspaceError {}
export class WorkspaceConflictError extends WorkspaceError {}
export class WorkspaceTransactionError extends WorkspaceError {}
export class WorkspaceUnavailableError extends WorkspaceError {}
