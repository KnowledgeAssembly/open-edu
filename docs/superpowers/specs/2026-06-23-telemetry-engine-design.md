# Telemetry Engine — Design Spec

## Overview

Epic 7 implements the Telemetry Engine for Open-Edu. It provides an event emission pipeline using RxJS, append-only JSONL persistence, and session lifecycle management. Defined in `packages/telemetry/`, depends on `@open-edu/schemas` (for `TelemetryEventSchema` and `TelemetryEvent` type) and `rxjs`.

## Stories

| Story | Description |
|-------|-------------|
| 7.1 | Telemetry event emitter (RxJS Subject/Observable pipeline) |
| 7.2 | JSONL append-only persistence layer |
| 7.3 | Telemetry session management (start/stop/restore) |

## Architecture

```
TelemetrySession (7.3)
  ├── owns TelemetryEmitter (7.1) — emits validated events
  └── owns JsonlPersister (7.2) — subscribes to emitter, writes to file
  
  start() → generates sessionId, initializes emitter + persister
  stop()  → completes emitter, flushes and closes persister
  emit(event) → delegates to emitter, which stamps timestamp + sessionId
```

### Data flow

1. `session.start()` generates a UUID sessionId, creates emitter and persister
2. Persister subscribes to emitter's `events$` Observable
3. `session.emit({ event: 'node_open', nodeId: '...' })` → emitter validates via `TelemetryEventSchema.parse()`, stamps `timestamp` and `sessionId`, pushes to `Subject`
4. Persister receives validated event, appends JSON line to `.jsonl` file
5. `session.stop()` → `emitter.complete()` → `persister.flush()` → `persister.close()`

## Module Layout

```
packages/telemetry/src/
├── index.ts              # Barrel exports
├── version.ts            # TELEMETRY_VERSION constant
├── types.ts              # TelemetryEmitResult, Persister interface
├── errors.ts             # TelemetryError base class
├── emitter.ts            # TelemetryEmitter class (Story 7.1)
├── persister.ts          # JsonlPersister class (Story 7.2)
└── session.ts            # TelemetrySession class (Story 7.3)
```

## Key Interfaces

### TelemetryEmitResult

```typescript
interface TelemetryEmitResult {
  success: boolean;
  event?: TelemetryEvent;
  error?: ZodError;
}
```

### Persister interface

```typescript
interface Persister {
  write(event: TelemetryEvent): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
```

### TelemetryEmitter (Story 7.1)

```typescript
class TelemetryEmitter {
  constructor(schema?: typeof TelemetryEventSchema)

  emit(data: Omit<TelemetryEvent, 'timestamp'>): TelemetryEmitResult
  get events$(): Observable<TelemetryEvent>
  complete(): void
}
```

- Wraps a private `Subject<TelemetryEvent>`
- `emit()` validates with `TelemetryEventSchema.parse()`, adds `timestamp: Date.now()`, pushes to Subject
- Returns `{ success: true, event }` on success, `{ success: false, error }` on parse failure
- `events$` exposes the Subject as an Observable (consumers subscribe here)
- `complete()` calls `subject.complete()` — further emits are silently dropped
- Constructor accepts optional schema override for testing (defaults to `TelemetryEventSchema`)

### JsonlPersister (Story 7.2)

```typescript
class JsonlPersister implements Persister {
  constructor(source: Observable<TelemetryEvent>, filePath: string)

  write(event: TelemetryEvent): Promise<void>
  flush(): Promise<void>
  close(): Promise<void>
}
```

- Constructor subscribes to `source` Observable; each event is serialized as `JSON.stringify(event) + '\n'` and written to `filePath` via `fs.createWriteStream` in append mode
- `write()` is called by the subscription — also exposed for manual use
- `flush()` returns a Promise that resolves when the write stream's `drain` event fires (all buffered data written)
- `close()` unsubscribes from source and closes the file descriptor
- File is created if it doesn't exist; appended to if it does
- Errors during write are emitted on the stream's `error` event (not silently swallowed)

### TelemetrySession (Story 7.3)

```typescript
class TelemetrySession {
  constructor(options?: {
    persister?: Persister;
    schema?: typeof TelemetryEventSchema;
  })

  start(): string   // returns sessionId
  stop(): Promise<void>
  emit(event: Omit<TelemetryEvent, 'timestamp'>): TelemetryEmitResult
  get sessionId(): string | null
  get isActive(): boolean
  get events$(): Observable<TelemetryEvent>
}
```

- `start()`: generates `crypto.randomUUID()` as sessionId, creates `TelemetryEmitter`, subscribes persister (if provided) to emitter's `events$`
- `stop()`: calls `emitter.complete()`, then `persister.flush()` + `persister.close()` (if persister exists)
- `emit()`: stamps both `timestamp` and `sessionId` onto the event before passing to emitter
- Calling `emit()` before `start()` or after `stop()` returns `{ success: false }` with an error
- `restart()` not explicitly needed — `stop()` then `start()` achieves it. `pause()`/`resume()` deferred (not in MVP).

## Error Handling

- `TelemetryError extends Error` — base error class with `code: string`
- `TelemetryValidationError extends TelemetryError` — wraps Zod parse errors
- `TelemetryPersistenceError extends TelemetryError` — wraps stream/file errors
- All errors are exported from `errors.ts`

## Testing Strategy

- **Emitter tests**: mock schema, test valid event passes, invalid event fails, Observable emits correctly, complete() stops emissions
- **Persister tests**: write to temp file, verify JSONL format, verify append behavior, test flush & close
- **Session tests**: full lifecycle (start → emit → stop), sessionId tagging, double-start guard, emit-before-start guard, persister integration

## Non-Goals (MVP)

- No `pause()` / `resume()` on session (start→stop is sufficient)
- No file rotation or size limits
- No sending telemetry over HTTP
- No browser-based persister (IndexedDB, etc.)
- No retry logic for write failures
- No telemetry event filtering or sampling
