export function parseSemver(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.');
  return {
    major: parseInt(parts[0] ?? '0', 10) || 0,
    minor: parseInt(parts[1] ?? '0', 10) || 0,
    patch: parseInt(parts[2] ?? '0', 10) || 0,
  };
}

export function semverGreaterThan(version: string, other: string): boolean {
  const a = parseSemver(version);
  const b = parseSemver(other);
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

export function semverEquals(version: string, other: string): boolean {
  return version === other;
}
