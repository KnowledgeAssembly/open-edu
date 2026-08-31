import { describe, it, expect } from 'vitest';
import {
  WorkspaceError,
  WorkspaceNotFoundError,
  WorkspacePathError,
  WorkspacePermissionError,
  WorkspaceConflictError,
  WorkspaceTransactionError,
  WorkspaceUnavailableError,
} from './errors.js';

describe('workspace errors', () => {
  const subclasses = [
    WorkspaceNotFoundError,
    WorkspacePathError,
    WorkspacePermissionError,
    WorkspaceConflictError,
    WorkspaceTransactionError,
    WorkspaceUnavailableError,
  ];

  it('names subclasses correctly', () => {
    for (const Ctor of subclasses) {
      expect(new Ctor('boom').name).toBe(Ctor.name);
    }
  });

  it('is instanceof WorkspaceError and Error', () => {
    for (const Ctor of subclasses) {
      const err = new Ctor('boom');
      expect(err).toBeInstanceOf(WorkspaceError);
      expect(err).toBeInstanceOf(Error);
    }
  });
});
