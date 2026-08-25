/**
 * Renders the frame-src CSP value the learner hosting headers must set so a
 * sandboxed widget document (from a verified registry origin) may load in an
 * iframe. Production CSP is injected via hosting headers; Vite dev can only
 * approximate it, so full CSP enforcement is verified by E2E in Phase 4.
 */
export function frameSrcCsp(allowedOrigins: string[]): string {
  const extra = allowedOrigins.join(' ');
  return `frame-src 'self' ${extra}`.trim();
}
