export interface GithubReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

export interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: GithubReleaseAsset[];
}

const API = 'https://api.github.com';
const TAG_RE = /^(.+)-v(\d+)\.(\d+)\.(\d+)$/;

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function listReleases(repo: string, token?: string): Promise<GithubRelease[]> {
  const res = await fetch(`${API}/repos/${repo}/releases?per_page=100`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} listing releases: ${await res.text()}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data))
    throw new Error('GitHub API returned an unexpected payload for releases');
  return data as GithubRelease[];
}

export async function getReleaseByTag(
  repo: string,
  tag: string,
  token?: string,
): Promise<GithubRelease> {
  const res = await fetch(`${API}/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`, {
    headers: headers(token),
  });
  if (!res.ok)
    throw new Error(`GitHub API ${res.status} for release "${tag}": ${await res.text()}`);
  return (await res.json()) as GithubRelease;
}

export async function fetchAssetBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { Accept: 'application/octet-stream' } });
  if (!res.ok) throw new Error(`Asset fetch ${res.status}: ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

export function parseReleaseTag(tag: string): { id: string; version: string } | null {
  const m = TAG_RE.exec(tag);
  if (!m) return null;
  return { id: m[1]!, version: `${m[2]}.${m[3]}.${m[4]}` };
}

export function parseChecksums(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && /^[a-f0-9]{64}$/.test(parts[0]!)) {
      map.set(parts[parts.length - 1]!.replace(/^[*]/, ''), parts[0]!);
    }
  }
  return map;
}
