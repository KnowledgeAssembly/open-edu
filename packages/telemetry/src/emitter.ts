import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import { TelemetryEventSchema } from '@open-edu/schemas';
import type { TelemetryEvent } from '@open-edu/schemas';
import type { ZodSchema } from 'zod';
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
        error: parseResult.error,
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
