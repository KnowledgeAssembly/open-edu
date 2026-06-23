import type { TelemetryEvent } from '@open-edu/schemas';

export interface TelemetryEmitResult {
  success: boolean;
  event?: TelemetryEvent;
  error?: Error;
}

export interface Persister {
  write(event: TelemetryEvent): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
}
