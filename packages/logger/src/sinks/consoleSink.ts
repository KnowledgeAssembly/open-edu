import type { LogSink, LogEntry, LogLevel } from '../types.js';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GRAY = '\x1b[90m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

const LEVEL_COLORS_NODE: Record<LogLevel, string> = {
  debug: DIM,
  info: GREEN,
  warn: YELLOW,
  error: RED,
};

const LEVEL_COLORS_BROWSER: Record<LogLevel, string> = {
  debug: 'color: #888',
  info: 'color: #22c55e',
  warn: 'color: #eab308',
  error: 'color: #ef4444; font-weight: bold',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

function formatTimestampNode(ts: string): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${GRAY}${hh}:${mm}:${ss}${RESET}`;
}

function formatLevelNode(level: LogLevel): string {
  const color = LEVEL_COLORS_NODE[level];
  const label = level.toUpperCase().padEnd(5);
  return `${color}${label}${RESET}`;
}

function formatScopeNode(scope: string): string {
  return `${CYAN}[${scope}]${RESET}`;
}

function formatMessageNode(entry: LogEntry): string {
  const parts: string[] = [];
  parts.push(formatTimestampNode(entry.timestamp));
  parts.push(formatLevelNode(entry.level));
  parts.push(formatScopeNode(entry.scope));
  parts.push(entry.message);

  if (entry.correlationId) {
    parts.push(`${DIM}[cid:${entry.correlationId.substring(0, 8)}]${RESET}`);
  }

  return parts.join(' ');
}

function formatMessageBrowser(entry: LogEntry): [string, string] {
  const color = LEVEL_COLORS_BROWSER[entry.level];
  const ts = new Date(entry.timestamp).toLocaleTimeString();
  const prefix = `%c[${ts}] [${entry.scope}]`;
  return [prefix, color];
}

export class ConsoleSink implements LogSink {
  write(entry: LogEntry): void {
    if (isBrowser()) {
      this.#writeBrowser(entry);
    } else {
      this.#writeNode(entry);
    }
  }

  #writeNode(entry: LogEntry): void {
    const formatted = formatMessageNode(entry);

    switch (entry.level) {
      case 'error':
        console.error(formatted);
        if (entry.error?.stack) {
          console.error(`  ${DIM}${entry.error.stack.split('\n').join(`\n  `)}${RESET}`);
        }
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'debug':
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      const ctxStr = JSON.stringify(entry.context, null, 2);
      console.log(`  ${DIM}${ctxStr.split('\n').join(`\n  `)}${RESET}`);
    }
  }

  #writeBrowser(entry: LogEntry): void {
    const [prefix, color] = formatMessageBrowser(entry);
    const logFn = this.#browserLogFn(entry.level);

    logFn(prefix, color, entry.message, entry.context ?? '');

    if (entry.error?.stack) {
      logFn(`  ${entry.error.name}: ${entry.error.message}`);
      console.debug(entry.error.stack);
    }
  }

  #browserLogFn(level: LogLevel): typeof console.log {
    switch (level) {
      case 'error':
        return console.error.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'debug':
        return console.debug.bind(console);
      default:
        return console.log.bind(console);
    }
  }
}
