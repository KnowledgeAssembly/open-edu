import type { LogSink, LogEntry } from '../types.js';

export interface MemorySinkOptions {
  capacity?: number;
}

export class MemorySink implements LogSink {
  readonly #capacity: number;
  readonly #buffer: LogEntry[];
  #writeIndex: number = 0;
  #totalWritten: number = 0;

  constructor(options: MemorySinkOptions = {}) {
    this.#capacity = options.capacity ?? 500;
    this.#buffer = new Array(this.#capacity);
  }

  write(entry: LogEntry): void {
    this.#buffer[this.#writeIndex] = entry;
    this.#writeIndex = (this.#writeIndex + 1) % this.#capacity;
    this.#totalWritten++;
  }

  entries(): LogEntry[] {
    if (this.#totalWritten === 0) return [];

    if (this.#totalWritten < this.#capacity) {
      return this.#buffer.slice(0, this.#totalWritten).filter(Boolean);
    }

    const result: LogEntry[] = [];
    for (let i = 0; i < this.#capacity; i++) {
      const idx = (this.#writeIndex + i) % this.#capacity;
      const entry = this.#buffer[idx];
      if (entry) result.push(entry);
    }
    return result;
  }

  entriesByLevel(level: string): LogEntry[] {
    return this.entries().filter((e) => e.level === level);
  }

  entriesByScope(prefix: string): LogEntry[] {
    return this.entries().filter((e) => e.scope.startsWith(prefix));
  }

  recent(count: number): LogEntry[] {
    const all = this.entries();
    return all.slice(-count);
  }

  clear(): void {
    this.#buffer.length = 0;
    this.#buffer.length = this.#capacity;
    this.#writeIndex = 0;
    this.#totalWritten = 0;
  }

  get count(): number {
    return Math.min(this.#totalWritten, this.#capacity);
  }

  get totalWritten(): number {
    return this.#totalWritten;
  }
}
