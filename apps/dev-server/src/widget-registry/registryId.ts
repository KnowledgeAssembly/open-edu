import { createHash } from 'node:crypto';

export function deriveRegistryId(origin: string): string {
  const url = new URL(origin);
  const host = url.hostname.replace(/\./g, '-');
  const port = url.port ? `-${url.port}` : '';
  const hash = createHash('sha256').update(origin).digest('hex').slice(0, 12);
  return `${host}${port}-${hash}`;
}
