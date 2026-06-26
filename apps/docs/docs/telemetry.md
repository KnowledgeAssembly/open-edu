---
sidebar_position: 9
---

# Telemetry Engine (`@open-edu/telemetry`)

All learner interactions are modeled as RxJS event streams and persisted as JSONL (append-only, human readable, stream friendly).

## Architecture

```
Learner Action → TelemetryEmitter (RxJS Subject)
                      │
                      ▼
              JsonlPersister (append-only file)
                      │
                      ▼
              readJsonl() → createSummary()
```

## TelemetrySession

The primary API for capturing learner interactions:

```typescript
import { TelemetrySession } from '@open-edu/telemetry';

const session = new TelemetrySession();
session.start();

// Listen for all events
session.events$.subscribe((event) => {
  console.log(event);
});

// Emit custom telemetry events
session.emit({
  event: 'node_open',
  nodeId: 'nodes/intro.md',
  timestamp: Date.now(),
});

// Stop when done
session.stop();
```

## TelemetryEmitter

Lower-level event emitter for custom pipelines:

```typescript
import { TelemetryEmitter } from '@open-edu/telemetry';

const emitter = new TelemetryEmitter();
const unsub = emitter.events$.subscribe(console.log);

emitter.emit({
  event: 'quiz_answered',
  nodeId: 'nodes/quiz.json',
  questionId: 'q1',
  selectedId: 'b',
  correct: true,
});

unsub();
```

## JSONL Persistence

```typescript
import { JsonlPersister } from '@open-edu/telemetry';

const persister = new JsonlPersister('./telemetry.jsonl');
await persister.append(event);
const allEvents = await persister.readAll();
```

Events are appended as newline-delimited JSON — streamable, grepable, and git friendly.

## Reading & Summarizing

```typescript
import { readJsonl, createSummary } from '@open-edu/telemetry';

const result = await readJsonl('./telemetry.jsonl');
// result.events: TelemetryEvent[]
// result.errors: ParseError[]

const summary = createSummary(result.events);
// summary.totalEvents, summary.totalSessions,
// summary.nodeCompletions, summary.averageQuizScore
```

## CLI Reporting

```bash
edu report ./telemetry.jsonl        # Human-readable
edu report ./telemetry.jsonl --json  # Machine-readable
```

## Event Types

| Event                | Description                               |
| -------------------- | ----------------------------------------- |
| `node_open`          | Learner entered a node                    |
| `node_complete`      | Learner completed a node (includes score) |
| `quiz_answered`      | Learner answered a quiz question          |
| `hint_triggered`     | Learner requested a hint                  |
| `widget_interaction` | Learner interacted with a widget          |
| `route_triggered`    | Workflow routed to a specific node        |
