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
