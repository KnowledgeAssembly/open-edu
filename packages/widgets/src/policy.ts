import { DEFAULT_WIDGET_POLICY, isTrustTierEnabled, type WidgetPolicy } from '@open-edu/schemas';

export { DEFAULT_WIDGET_POLICY };

export function originOf(urlString: string): string {
  const url = new URL(urlString);
  return url.origin;
}

export function assertTrustedRemoteAllowed(urlString: string, policy: WidgetPolicy): void {
  if (!isTrustTierEnabled(policy, 'trusted-remote')) {
    throw new Error('trusted-remote widgets are disabled by deployment policy');
  }
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid widget URL: ${urlString}`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Widget URL must use https: (${urlString})`);
  }
  const allowed = new Set(policy.allowedOrigins.map((o) => new URL(o).origin));
  if (!allowed.has(url.origin)) {
    throw new Error(`Widget origin ${url.origin} is not in the deployment allowlist`);
  }
}
