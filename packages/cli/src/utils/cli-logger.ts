import { configureLogger } from '@open-edu/logger';

export function applyCliLogLevel(opts: { verbose?: boolean; quiet?: boolean }): void {
  if (opts.verbose) {
    configureLogger({ minLevel: 'debug' });
  } else if (opts.quiet) {
    configureLogger({ minLevel: 'error' });
  }
}
