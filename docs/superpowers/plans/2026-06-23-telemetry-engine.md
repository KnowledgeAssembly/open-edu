# Telemetry Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Epic 7 — Telemetry Engine with event emission (RxJS), JSONL persistence, and session management.

**Architecture:** Three classes — `TelemetryEmitter` wraps a `Subject<TelemetryEvent>`, `JsonlPersister` subscribes to the Observable and writes JSONL files, `TelemetrySession` orchestrates both with sessionId lifecycle. Platform-agnostic core, Node-only persister.

**Tech Stack:** TypeScript 5.x, RxJS 7.x, `@open-edu/schemas` (TelemetryEventSchema), Node.js fs, Vitest

---

### Task 1: Types, errors, and version

**Files:**

- Create: `packages/telemetry/src/version.ts`
- Create: `packages/telemetry/src/version.test.ts`
- Create: `packages/telemetry/src/errors.ts`
- Create: `packages/telemetry/src/errors.test.ts`
- Create: `packages/telemetry/src/types.ts`
- Create: `packages/telemetry/src/types.test.ts`

- [ ] **Step 1: Write version.ts**

```typescript
export const TELEMETRY_VERSION = '0.1.0';
```

- [ ] **Step 2: Write version.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { TELEMETRY_VERSION } from './version';

describe('TELEMETRY_VERSION', () => {
  it('should export version 0.1.0', () => {
    expect(TELEMETRY_VERSION).toBe('0.1.0');
  });
});
```

- [ ] **Step 3: Write errors.ts**

```typescript
export class TelemetryError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'TelemetryError';
    this.code = code;
  }
}

export class TelemetryValidationError extends TelemetryError {
  public readonly zodError: unknown;
  constructor(message: string, zodError: unknown) {
    super('TELEMETRY_VALIDATION_ERROR', message);
    this.name = 'TelemetryValidationError';
    this.zodError = zodError;
  }
}

export class TelemetryPersistenceError extends TelemetryError {
  constructor(message: string) {
    super('TELEMETRY_PERSISTENCE_ERROR', message);
    this.name = 'TelemetryPersistenceError';
  }
}
```

- [ ] **Step 4: Write errors.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { TelemetryError, TelemetryValidationError, TelemetryPersistenceError } from './errors';

describe('TelemetryError', () => {
  it('should set name and code', () => {
    const err = new TelemetryError('TEST_CODE', 'test message');
    expect(err.name).toBe('TelemetryError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test message');
  });
});

describe('TelemetryValidationError', () => {
  it('should extend TelemetryError with zodError', () => {
    const zodErr = new Error('parse failed');
    const err = new TelemetryValidationError('invalid', zodErr);
    expect(err.name).toBe('TelemetryValidationError');
    expect(err.code).toBe('TELEMETRY_VALIDATION_ERROR');
    expect(err.zodError).toBe(zodErr);
  });
});

describe('TelemetryPersistenceError', () => {
  it('should extend TelemetryError', () => {
    const err = new TelemetryPersistenceError('write failed');
    expect(err.name).toBe('TelemetryPersistenceError');
    expect(err.code).toBe('TELEMETRY_PERSISTENCE_ERROR');
  });
});
```

- [ ] **Step 5: Write types.ts**

```typescript
import type { TelemetryEvent } from '@open-edu/schemas';
import type { ZodError } from 'zod';

export interface TelemetryEmitResult {
  success: boolean;
  event?: TelemetryEvent;
  error?: ZodError;
}

export interface Persister {
  write(event: TelemetryEvent): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
```

- [ ] **Step 6: Write types.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import type { TelemetryEmitResult, Persister } from './types';

describe('types', () => {
  it('TelemetryEmitResult should be a valid type', () => {
    const result: TelemetryEmitResult = { success: true, event: undefined as any };
    expect(result.success).toBe(true);
  });

  it('Persister should be a valid interface', () => {
    const persister: Persister = {
      write: async () => {},
      flush: async () => {},
      close: async () => {},
    };
    expect(persister.write).toBeDefined();
    expect(persister.flush).toBeDefined();
    expect(persister.close).toBeDefined();
  });
});
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: 3 test files, 5 tests, all passing

- [ ] **Step 8: Commit**

```bash
git add packages/telemetry/src/version.ts packages/telemetry/src/version.test.ts packages/telemetry/src/errors.ts packages/telemetry/src/errors.test.ts packages/telemetry/src/types.ts packages/telemetry/src/types.test.ts
git commit -m "feat(telemetry): add types, errors, and version constants"
```

---

### Task 2: TelemetryEmitter (Story 7.1)

**Files:**

- Create: `packages/telemetry/src/emitter.ts`
- Create: `packages/telemetry/src/emitter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { TelemetryEmitter } from './emitter';
import { TelemetryEventSchema } from '@open-edu/schemas';

describe('TelemetryEmitter', () => {
  it('should emit a valid event and return success', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(true);
    expect(result.event).toBeDefined();
    expect(result.event!.event).toBe('node_open');
  });

  it('should reject an invalid event', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open' } as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should push events to the observable', () => {
    const emitter = new TelemetryEmitter();
    const events: any[] = [];
    const sub = emitter.events$.subscribe((e) => events.push(e));
    emitter.emit({ event: 'node_open', nodeId: 'n1' });
    emitter.emit({ event: 'node_complete', nodeId: 'n1', score: 85 });
    expect(events).toHaveLength(2);
    expect(events[0]!.event).toBe('node_open');
    expect(events[1]!.event).toBe('node_complete');
    sub.unsubscribe();
  });

  it('should stamp timestamp on emitted events', () => {
    const emitter = new TelemetryEmitter();
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.event!.timestamp).toBeGreaterThan(0);
  });

  it('should stop emitting after complete()', () => {
    const emitter = new TelemetryEmitter();
    const events: any[] = [];
    const sub = emitter.events$.subscribe((e) => events.push(e));
    emitter.complete();
    emitter.emit({ event: 'node_open', nodeId: 'n1' });
    expect(events).toHaveLength(0);
    sub.unsubscribe();
  });

  it('should not throw on double complete()', () => {
    const emitter = new TelemetryEmitter();
    emitter.complete();
    expect(() => emitter.complete()).not.toThrow();
  });

  it('should accept a custom schema', () => {
    const schema = TelemetryEventSchema;
    const emitter = new TelemetryEmitter(schema);
    const result = emitter.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect failures (no emitter.ts yet)**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: FAIL — module not found

- [ ] **Step 3: Write emitter.ts**

```typescript
import { Subject, Observable } from 'rxjs';
import { TelemetryEventSchema } from '@open-edu/schemas';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { ZodSchema, ZodError } from 'zod';
import type { TelemetryEmitResult } from './types';

export class TelemetryEmitter {
  private subject: Subject<TelemetryEvent>;
  private schema: ZodSchema;

  constructor(schema: ZodSchema = TelemetryEventSchema) {
    this.subject = new Subject<TelemetryEvent>();
    this.schema = schema;
  }

  emit(data: Omit<TelemetryEvent, 'timestamp'>): TelemetryEmitResult {
    const parseResult = this.schema.safeParse({
      ...data,
      timestamp: Date.now(),
    });

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error as ZodError,
      };
    }

    const event = parseResult.data as TelemetryEvent;
    this.subject.next(event);
    return { success: true, event };
  }

  get events$(): Observable<TelemetryEvent> {
    return this.subject.asObservable();
  }

  complete(): void {
    this.subject.complete();
  }
}
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: 6 new tests, all passing

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/emitter.ts packages/telemetry/src/emitter.test.ts
git commit -m "feat(telemetry): implement TelemetryEmitter (Story 7.1)"
```

---

### Task 3: JsonlPersister (Story 7.2)

**Files:**

- Create: `packages/telemetry/src/persister.ts`
- Create: `packages/telemetry/src/persister.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Subject } from 'rxjs';
import { JsonlPersister } from './persister';
import type { TelemetryEvent } from '@open-edu/schemas';

describe('JsonlPersister', () => {
  let tempDir: string;
  let filePath: string;
  let subject: Subject<TelemetryEvent>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'telemetry-test-'));
    filePath = path.join(tempDir, 'events.jsonl');
    subject = new Subject<TelemetryEvent>();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should write events to a JSONL file', async () => {
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    const event1: TelemetryEvent = { event: 'node_open', nodeId: 'n1', timestamp: 1000 };
    const event2: TelemetryEvent = {
      event: 'node_complete',
      nodeId: 'n1',
      score: 85,
      timestamp: 2000,
    };
    subject.next(event1);
    subject.next(event2);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!)).toEqual(event1);
    expect(JSON.parse(lines[1]!)).toEqual(event2);
  });

  it('should append to an existing file', async () => {
    fs.writeFileSync(filePath, '{"existing":true}\n', 'utf-8');
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    const event: TelemetryEvent = { event: 'node_open', nodeId: 'n1', timestamp: 1000 };
    subject.next(event);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
  });

  it('should handle empty event stream', async () => {
    const persister = new JsonlPersister(subject.asObservable(), filePath);
    subject.complete();
    await persister.flush();
    await persister.close();

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('');
  });
});
```

- [ ] **Step 2: Run tests — expect failures (no persister.ts yet)**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: FAIL — module not found

- [ ] **Step 3: Write persister.ts**

```typescript
import * as fs from 'fs';
import type { Observable, Subscription } from 'rxjs';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { Persister } from './types';
import { TelemetryPersistenceError } from './errors';

export class JsonlPersister implements Persister {
  private stream: fs.WriteStream;
  private subscription: Subscription;
  private flushResolve: (() => void) | null = null;
  private pendingFlush = false;

  constructor(source: Observable<TelemetryEvent>, filePath: string) {
    this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    this.stream.on('drain', () => {
      if (this.flushResolve) {
        this.flushResolve();
        this.flushResolve = null;
      }
    });
    this.subscription = source.subscribe({
      next: (event) => {
        const line = JSON.stringify(event) + '\n';
        const canContinue = this.stream.write(line);
        if (!canContinue) {
          this.pendingFlush = true;
        }
      },
      error: (err) => {
        throw new TelemetryPersistenceError(`Stream error: ${String(err)}`);
      },
    });
    this.stream.on('error', (err) => {
      throw new TelemetryPersistenceError(`Stream error: ${err.message}`);
    });
  }

  async write(event: TelemetryEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      const line = JSON.stringify(event) + '\n';
      const canContinue = this.stream.write(line, (err) => {
        if (err) reject(new TelemetryPersistenceError(err.message));
        else resolve();
      });
      if (!canContinue) {
        this.pendingFlush = true;
      } else {
        resolve();
      }
    });
  }

  async flush(): Promise<void> {
    if (!this.pendingFlush) return;
    return new Promise((resolve) => {
      this.flushResolve = resolve;
      this.stream.emit('drain');
    });
  }

  async close(): Promise<void> {
    this.subscription.unsubscribe();
    return new Promise((resolve) => {
      this.stream.end(resolve);
    });
  }
}
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: 3 new tests, all passing

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/persister.ts packages/telemetry/src/persister.test.ts
git commit -m "feat(telemetry): implement JsonlPersister (Story 7.2)"
```

---

### Task 4: TelemetrySession (Story 7.3)

**Files:**

- Create: `packages/telemetry/src/session.ts`
- Create: `packages/telemetry/src/session.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetrySession } from './session';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { Persister } from './types';

function createMockPersister(): Persister {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    flush: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TelemetrySession', () => {
  let session: TelemetrySession;
  let persister: Persister;

  beforeEach(() => {
    persister = createMockPersister();
    session = new TelemetrySession({ persister });
  });

  it('should generate a sessionId on start()', () => {
    const id = session.start();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(session.sessionId).toBe(id);
  });

  it('should be active after start()', () => {
    session.start();
    expect(session.isActive).toBe(true);
  });

  it('should not be active before start()', () => {
    expect(session.isActive).toBe(false);
  });

  it('should not be active after stop()', async () => {
    session.start();
    await session.stop();
    expect(session.isActive).toBe(false);
  });

  it('should emit events tagged with sessionId and timestamp', () => {
    session.start();
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(true);
    expect(result.event!.sessionId).toBe(session.sessionId);
    expect(result.event!.timestamp).toBeGreaterThan(0);
  });

  it('should reject emit() before start()', () => {
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject emit() after stop()', async () => {
    session.start();
    await session.stop();
    const result = session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(result.success).toBe(false);
  });

  it('should pass events through to the persister', () => {
    session.start();
    session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(persister.write).toHaveBeenCalledTimes(1);
    const written = persister.write.mock.calls[0]![0] as TelemetryEvent;
    expect(written.event).toBe('node_open');
    expect(written.nodeId).toBe('n1');
  });

  it('should flush and close persister on stop()', async () => {
    session.start();
    await session.stop();
    expect(persister.flush).toHaveBeenCalledTimes(1);
    expect(persister.close).toHaveBeenCalledTimes(1);
  });

  it('should expose events$ observable', () => {
    session.start();
    const events: any[] = [];
    const sub = session.events$.subscribe((e) => events.push(e));
    session.emit({ event: 'node_open', nodeId: 'n1' });
    expect(events).toHaveLength(1);
    sub.unsubscribe();
  });

  it('should return sessionId as null before start', () => {
    expect(session.sessionId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect failures (no session.ts yet)**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: FAIL — module not found

- [ ] **Step 3: Write session.ts**

```typescript
import { Observable } from 'rxjs';
import { TelemetryEventSchema } from '@open-edu/schemas';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { ZodSchema } from 'zod';
import type { Persister, TelemetryEmitResult } from './types';
import { TelemetryEmitter } from './emitter';
import { TelemetryValidationError } from './errors';

export interface TelemetrySessionOptions {
  persister?: Persister;
  schema?: ZodSchema;
}

export class TelemetrySession {
  private emitter: TelemetryEmitter | null = null;
  private persister: Persister | null;
  private schema: ZodSchema;
  private _sessionId: string | null = null;

  constructor(options: TelemetrySessionOptions = {}) {
    this.persister = options.persister ?? null;
    this.schema = options.schema ?? TelemetryEventSchema;
  }

  start(): string {
    this._sessionId = crypto.randomUUID();
    this.emitter = new TelemetryEmitter(this.schema);

    if (this.persister) {
      this.emitter.events$.subscribe({
        next: (event) => {
          this.persister!.write(event).catch(() => {});
        },
      });
    }

    return this._sessionId;
  }

  get sessionId(): string | null {
    return this._sessionId;
  }

  get isActive(): boolean {
    return this._sessionId !== null && this.emitter !== null;
  }

  get events$(): Observable<TelemetryEvent> {
    if (!this.emitter) {
      throw new TelemetryValidationError('Session not started', null);
    }
    return this.emitter.events$;
  }

  emit(data: Omit<TelemetryEvent, 'timestamp'>): TelemetryEmitResult {
    if (!this.isActive || !this.emitter) {
      return {
        success: false,
        error: new TelemetryValidationError('Session not started', null),
      };
    }
    return this.emitter.emit({
      ...data,
      sessionId: this._sessionId!,
    } as any);
  }

  async stop(): Promise<void> {
    if (this.emitter) {
      this.emitter.complete();
      this.emitter = null;
    }
    if (this.persister) {
      await this.persister.flush();
      await this.persister.close();
    }
    this._sessionId = null;
  }
}
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: 11 new tests, all passing

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry/src/session.ts packages/telemetry/src/session.test.ts
git commit -m "feat(telemetry): implement TelemetrySession (Story 7.3)"
```

---

### Task 5: Update barrel exports

**Files:**

- Modify: `packages/telemetry/src/index.ts`
- Modify: `packages/telemetry/src/index.test.ts`

- [ ] **Step 1: Update index.ts**

```typescript
export { TELEMETRY_VERSION } from './version';
export { TelemetryEmitter } from './emitter';
export type { TelemetryEmitResult } from './types';
export { JsonlPersister } from './persister';
export type { Persister } from './types';
export { TelemetrySession } from './session';
export type { TelemetrySessionOptions } from './session';
export { TelemetryError, TelemetryValidationError, TelemetryPersistenceError } from './errors';
```

- [ ] **Step 2: Update index.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import {
  TELEMETRY_VERSION,
  TelemetryEmitter,
  JsonlPersister,
  TelemetrySession,
  TelemetryError,
  TelemetryValidationError,
  TelemetryPersistenceError,
} from './index';

describe('@open-edu/telemetry exports', () => {
  it('should export a version', () => {
    expect(TELEMETRY_VERSION).toBe('0.1.0');
  });

  it('should export TelemetryEmitter', () => {
    expect(TelemetryEmitter).toBeDefined();
  });

  it('should export JsonlPersister', () => {
    expect(JsonlPersister).toBeDefined();
  });

  it('should export TelemetrySession', () => {
    expect(TelemetrySession).toBeDefined();
  });

  it('should export error classes', () => {
    expect(TelemetryError).toBeDefined();
    expect(TelemetryValidationError).toBeDefined();
    expect(TelemetryPersistenceError).toBeDefined();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @open-edu/telemetry test`
Expected: All tests pass (version + emitter + persister + session + errors + types + barrel)

- [ ] **Step 4: Commit**

```bash
git add packages/telemetry/src/index.ts packages/telemetry/src/index.test.ts
git commit -m "feat(telemetry): update barrel exports"
```

---

### Task 6: Final verification

- [ ] **Step 1: Format check**

Run: `pnpm format:check`
Expected: All matched files use Prettier code style

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: All packages pass typecheck

- [ ] **Step 3: Full test suite**

Run: `pnpm test`
Expected: All packages pass, including telemetry's ~20 tests

- [ ] **Step 4: Lint**

Run: `pnpm lint`
Expected: No errors (warnings allowed)

- [ ] **Step 5: Commit any fixes**

```bash
# Only if fixes were needed
git add -A
git commit -m "chore: fix formatting/type/lint issues"
```

---

### Task 7: Push branch and create PR

- [ ] **Step 1: Create branch and push**

```bash
git checkout -b epic-7-telemetry-engine
git push -u origin epic-7-telemetry-engine
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat(telemetry): implement Epic 7 - Telemetry Engine" \
  --body "## Summary

Implements Epic 7: Telemetry Engine — RxJS-based event emission, JSONL file persistence, and session lifecycle management.

### Stories

**Story 7.1 — Telemetry Event Emitter**
- \`TelemetryEmitter\` wraps a \`Subject<TelemetryEvent>\`, validates with \`TelemetryEventSchema\`, stamps timestamps
- Exposes \`events$\` Observable for consumers (persisters, rewards, etc.)

**Story 7.2 — JSONL Append-Only Persistence**
- \`JsonlPersister\` subscribes to any Observable source, writes each event as a JSON line to a \`.jsonl\` file
- Implements \`Persister\` interface for pluggability
- Supports append, flush, and close lifecycle

**Story 7.3 — Session Management**
- \`TelemetrySession\` orchestrates emitter + persister
- \`start()\` generates UUID sessionId, wires persister to emitter
- \`stop()\` completes emitter, flushes and closes persister
- Tags all events with sessionId

### Verification
- \`pnpm test\`: All ~20 telemetry tests pass
- \`pnpm typecheck\`: No errors
- \`pnpm lint\`: No errors
- \`pnpm format:check\`: All clean

Closes Epic 7" \
  --base main \
  --head epic-7-telemetry-engine
```
