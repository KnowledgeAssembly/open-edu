---
sidebar_position: 20
---

# Structured Logging (`@open-edu/logger`)

`@open-edu/logger` is a structured, isomorphic logging engine for Open-Edu. It runs in Node and the browser behind one API.

## What it provides

- `createLogger` / `configureLogger` / `defaultLogger`, child loggers, and `getGlobalConfig`.
- Sinks: `ConsoleSink`, `MemorySink` (in-process capture), `JsonlSink` (append JSON-lines output), and `TelemetryBridgeSink` (bridge log entries to the telemetry pipeline).
- React integration: `LoggerProvider` + `useLogger`.
- Typed levels (`LOG_LEVELS`, `LogLevel`) and errors (`LoggerError`, `LoggerConfigError`, `LoggerWriteError`).

## Consumers

- `apps/dev-server` (Studio) and other node/browser packages that need structured, sink-configurable logging.
