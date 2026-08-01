import { createLogger } from '@open-edu/logger';

export const coreLoaderLogger = createLogger({ scope: 'core:loader' });
export const coreValidatorLogger = createLogger({ scope: 'core:validator' });
export const coreCatalogLogger = createLogger({ scope: 'core:catalog' });
export const coreScannerLogger = createLogger({ scope: 'core:scanner' });
export const corePatcherLogger = createLogger({ scope: 'core:patcher' });
