export const OEP_PROXY_PATH = '/api/oep-proxy';

export function proxyUrl(targetUrl: string): string {
  return `${OEP_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
}
