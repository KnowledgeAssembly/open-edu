const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

export function info(msg: string): void {
  console.log(msg);
}

export function success(msg: string): void {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${RED}✗${RESET} ${msg}`);
}

export function verbose(msg: string, isVerbose: boolean): void {
  if (isVerbose) {
    console.log(`${DIM}${msg}${RESET}`);
  }
}

export function header(title: string): void {
  console.log(`\n${BOLD}${CYAN}${title}${RESET}`);
}

export function divider(): void {
  console.log('='.repeat(50));
}

export function reportTable(
  metrics: { label: string; value: string | number; status: string }[],
): void {
  const labelPad = Math.max(...metrics.map((m) => m.label.length));
  const valuePad = Math.max(...metrics.map((m) => String(m.value).length));

  const width = Math.max(0, labelPad + valuePad + 12);
  console.log(`\n${'─'.repeat(width)}`);
  console.log(
    `${BOLD}${' '.repeat(2)}Metric${' '.repeat(Math.max(0, labelPad - 6))}${' '.repeat(2)}Count${' '.repeat(Math.max(0, valuePad - 5))}Status${RESET}`,
  );
  console.log(`${'─'.repeat(width)}`);

  for (const m of metrics) {
    const statusIcon =
      m.status === 'ok'
        ? `${GREEN}✅${RESET}`
        : m.status === 'warn'
          ? `${YELLOW}ℹ️${RESET}`
          : `${RED}❌${RESET}`;
    console.log(
      `  ${m.label.padEnd(labelPad)}  ${String(m.value).padEnd(valuePad)}  ${statusIcon}`,
    );
  }

  console.log(`${'─'.repeat(width)}\n`);
}
