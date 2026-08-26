export const VERIFY_MAX_BYTES = 64 * 1024;

export interface WidgetVerificationResult {
  protocol: boolean;
  sizeOk: boolean;
  cspOk: boolean;
  noAllowSameOrigin: boolean;
}

const PROTOCOL_RE = /[oO]pen-edu\.widget\/1/;

const RESOURCE_ATTR_RE = /\b(?:src|href)=["']([^"']*)["']/g;

function isAllowedResource(value: string): boolean {
  if (value === '') return true;
  if (value.startsWith('data:')) return true;
  if (value.startsWith('https:')) return true;
  if (value.startsWith('#')) return true;
  return false;
}

export function isSelfContainedHtml(html: string): { ok: boolean; offending?: string } {
  let match: RegExpExecArray | null;
  RESOURCE_ATTR_RE.lastIndex = 0;
  while ((match = RESOURCE_ATTR_RE.exec(html)) !== null) {
    const value = match[1] ?? '';
    if (!isAllowedResource(value)) {
      return { ok: false, offending: value };
    }
  }
  return { ok: true };
}

export function extractCspMeta(html: string): string | undefined {
  const re1 = /<meta\s[^>]*?content=(["'])(.*?)\1[^>]*?http-equiv=["']Content-Security-Policy["']/i;
  const re2 = /<meta\s[^>]*?http-equiv=["']Content-Security-Policy["'][^>]*?content=(["'])(.*?)\1/i;
  const m1 = re1.exec(html);
  if (m1) return m1[2];
  const m2 = re2.exec(html);
  if (m2) return m2[2];
  return undefined;
}

export function hasCspDirective(cspText: string, directive: string): boolean {
  for (const part of cspText.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) continue;
    const name = trimmed.slice(0, spaceIdx).trim();
    const value = trimmed.slice(spaceIdx + 1).trim();
    if (name === directive && value === "'none'") return true;
  }
  return false;
}

export function verifyDocumentCsp(html: string, header?: string): boolean {
  const cspText = header ?? extractCspMeta(html);
  return (
    typeof cspText === 'string' &&
    hasCspDirective(cspText, 'connect-src') &&
    hasCspDirective(cspText, 'frame-src')
  );
}

export function runWidgetVerification(documentHtml: string): WidgetVerificationResult {
  const protocol = PROTOCOL_RE.test(documentHtml);
  const sizeOk = new TextEncoder().encode(documentHtml).byteLength <= VERIFY_MAX_BYTES;
  const cspOk = verifyDocumentCsp(documentHtml);
  const hasIframe = /<iframe\b/i.test(documentHtml);
  const noAllowSameOrigin = hasIframe ? !/allow-same-origin/i.test(documentHtml) : true;
  return { protocol, sizeOk, cspOk, noAllowSameOrigin };
}
