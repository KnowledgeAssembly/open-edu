import type { ZodError } from 'zod';

export interface ErrorDiagnostics {
  file?: string;
  path?: string;
  suggestion?: string;
}

export class PackageLoadError extends Error {
  public readonly code: string;
  public readonly file?: string;
  public readonly path?: string;
  public readonly suggestion?: string;

  constructor(code: string, message: string, diagnostics?: ErrorDiagnostics) {
    super(message);
    this.name = 'PackageLoadError';
    this.code = code;
    this.file = diagnostics?.file;
    this.path = diagnostics?.path;
    this.suggestion = diagnostics?.suggestion;
  }
}

export class ManifestValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError, diagnostics?: ErrorDiagnostics) {
    super('MANIFEST_VALIDATION_ERROR', message, diagnostics);
    this.name = 'ManifestValidationError';
    this.zodError = zodError ?? null;
  }
}

export class NodeLoadError extends PackageLoadError {
  constructor(message: string, diagnostics?: ErrorDiagnostics) {
    super('NODE_LOAD_ERROR', message, diagnostics);
    this.name = 'NodeLoadError';
  }
}

export class AssetNotFoundError extends PackageLoadError {
  constructor(assetPath: string, diagnostics?: ErrorDiagnostics) {
    super('ASSET_NOT_FOUND', `Asset not found: ${assetPath}`, diagnostics);
    this.name = 'AssetNotFoundError';
  }
}

export class WorkflowValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError, diagnostics?: ErrorDiagnostics) {
    super('WORKFLOW_VALIDATION_ERROR', message, diagnostics);
    this.name = 'WorkflowValidationError';
    this.zodError = zodError ?? null;
  }
}

export class WorkflowRouteError extends PackageLoadError {
  constructor(message: string, diagnostics?: ErrorDiagnostics) {
    super('WORKFLOW_ROUTE_ERROR', message, diagnostics);
    this.name = 'WorkflowRouteError';
  }
}

export class EntryNodeNotFoundError extends PackageLoadError {
  constructor(message: string, diagnostics?: ErrorDiagnostics) {
    super('ENTRY_NODE_NOT_FOUND', message, diagnostics);
    this.name = 'EntryNodeNotFoundError';
  }
}

export class RewardsValidationError extends PackageLoadError {
  public readonly zodError: ZodError | null;

  constructor(message: string, zodError?: ZodError, diagnostics?: ErrorDiagnostics) {
    super('REWARDS_VALIDATION_ERROR', message, diagnostics);
    this.name = 'RewardsValidationError';
    this.zodError = zodError ?? null;
  }
}
