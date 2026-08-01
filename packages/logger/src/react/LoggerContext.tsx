import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Logger, type ILogger } from '../logger.js';
import type { LogSink, LogLevel } from '../types.js';

export interface LoggerContextValue {
  logger: Logger;
  getLogger: (scope: string) => Logger;
}

export interface LoggerProviderProps {
  sinks?: LogSink[];
  minLevel?: LogLevel;
  children: ReactNode;
}

const LoggerContext = createContext<LoggerContextValue | null>(null);

const SHARED_ROOT = new Logger({ scope: 'open-edu' });

export function LoggerProvider({ sinks, minLevel, children }: LoggerProviderProps): JSX.Element {
  const value = useMemo<LoggerContextValue>(() => {
    const logger = new Logger({ scope: 'open-edu', sinks, minLevel });
    return {
      logger,
      getLogger: (scope: string) => logger.child({ scope }),
    };
  }, [sinks, minLevel]);

  return <LoggerContext.Provider value={value}>{children}</LoggerContext.Provider>;
}

export function useLogger(scope?: string): ILogger {
  const ctx = useContext(LoggerContext);
  if (!ctx) {
    if (scope) {
      return new Logger({ scope });
    }
    return SHARED_ROOT;
  }
  if (scope) {
    return ctx.getLogger(scope);
  }
  return ctx.logger;
}

export { LoggerContext };
