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
  const metaRe =
    /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*content=(["'])(.*?)\1[^>]*>/i;
  const match = metaRe.exec(html);
  return match?.[2];
}

export function verifyDocumentCsp(html: string, header?: string): boolean {
  const cspText = header ?? extractCspMeta(html);
  return (
    typeof cspText === 'string' &&
    cspText.includes("connect-src 'none'") &&
    cspText.includes("frame-src 'none'")
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
