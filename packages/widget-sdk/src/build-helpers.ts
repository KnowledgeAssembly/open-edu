import { createHash } from 'node:crypto';

/**
 * Compute the sha256 CSP hash for an inline script element.
 * Pass the exact string content of the inline <script> tag
 * (not the outer HTML — only the text between <script> and </script>).
 * Returns the canonical `sha256-<base64>` format required by CSP.
 */
export function computeSelfContainedCspHash(inlineScriptContent: string): string {
  const hash = createHash('sha256').update(inlineScriptContent, 'utf8').digest('base64');
  return `sha256-${hash}`;
}
