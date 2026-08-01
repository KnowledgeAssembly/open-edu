import type { LogSink, LogEntry } from '../types.js';
import { LoggerWriteError } from '../errors.js';

export interface JsonlSinkOptions {
  filePath: string;
  flushIntervalMs?: number;
}

export class JsonlSink implements LogSink {
  readonly #filePath: string;
  readonly #buffer: string[] = [];
  readonly #flushIntervalMs: number;
  #timer: ReturnType<typeof setInterval> | null = null;
  #closed = false;

  constructor(options: JsonlSinkOptions) {
    this.#filePath = options.filePath;
    this.#flushIntervalMs = options.flushIntervalMs ?? 5000;

    this.#timer = setInterval(() => {
      void this.flush();
    }, this.#flushIntervalMs);

    if (this.#timer && typeof this.#timer === 'object' && 'unref' in this.#timer) {
      this.#timer.unref();
    }
  }

  write(entry: LogEntry): void {
    if (this.#closed) return;
    this.#buffer.push(JSON.stringify(entry));
  }

  async flush(): Promise<void> {
    if (this.#buffer.length === 0) return;
    const lines = this.#buffer.splice(0).join('\n') + '\n';
    try {
      const { appendFile } = await import('node:fs/promises');
      await appendFile(this.#filePath, lines);
    } catch (err) {
      throw new LoggerWriteError(`Failed to write log to ${this.#filePath}: ${String(err)}`);
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    if (this.#timer !== null) {
      clearInterval(this.#timer);
      this.#timer = null;
    }
    await this.flush();
  }
}
