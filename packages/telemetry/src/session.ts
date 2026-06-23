import type { Observable } from 'rxjs';
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
