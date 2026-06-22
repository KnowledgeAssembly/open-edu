import type { ZodError } from 'zod';

export class PackageLoadError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'PackageLoadError';
    this.code = code;
  }
}

export class ManifestValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError) {
    super('MANIFEST_VALIDATION_ERROR', message);
    this.name = 'ManifestValidationError';
    this.zodError = zodError ?? null;
  }
}

export class NodeLoadError extends PackageLoadError {
  constructor(message: string) {
    super('NODE_LOAD_ERROR', message);
    this.name = 'NodeLoadError';
  }
}

export class AssetNotFoundError extends PackageLoadError {
  constructor(assetPath: string) {
    super('ASSET_NOT_FOUND', `Asset not found: ${assetPath}`);
    this.name = 'AssetNotFoundError';
  }
}

export class WorkflowValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError) {
    super('WORKFLOW_VALIDATION_ERROR', message);
    this.name = 'WorkflowValidationError';
    this.zodError = zodError ?? null;
  }
}

export class WorkflowRouteError extends PackageLoadError {
  constructor(message: string) {
    super('WORKFLOW_ROUTE_ERROR', message);
    this.name = 'WorkflowRouteError';
  }
}

export class EntryNodeNotFoundError extends PackageLoadError {
  constructor(message: string) {
    super('ENTRY_NODE_NOT_FOUND', message);
    this.name = 'EntryNodeNotFoundError';
  }
}

export class RewardsValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError) {
    super('REWARDS_VALIDATION_ERROR', message);
    this.name = 'RewardsValidationError';
    this.zodError = zodError ?? null;
  }
}
