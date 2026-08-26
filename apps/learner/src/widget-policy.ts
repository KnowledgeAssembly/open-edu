/**
 * Renders the frame-src CSP value the learner hosting headers must set so a
 * sandboxed widget document (from a verified registry origin) may load in an
 * iframe. Production CSP is injected via hosting headers; Vite dev can only
 * approximate it, so full CSP enforcement is verified by E2E in Phase 4.
 *
 * Callers wire this value into hosting headers (e.g. Vercel `_headers` or
 * server middleware). It is not currently called from CourseRuntime because
 * the dev-server CSP is approximated; production deployments should call
 * frameSrcCsp(widgetOrigins) when injecting CSP headers.
 */
export function frameSrcCsp(allowedOrigins: string[]): string {
  const extra = allowedOrigins.join(' ');
  return `frame-src 'self' ${extra}`.trim();
}
