import * as fs from 'fs';
import type { Observable, Subscription } from 'rxjs';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { Persister } from './types.js';
import { TelemetryPersistenceError } from './errors.js';

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
